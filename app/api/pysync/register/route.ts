import { upsertPySyncDnsRecord } from "@/lib/cloudflare";
import prisma from "@/lib/prisma";
import { buildErrorResponse, buildResponse } from "@/lib/response";
import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { NextRequest } from "next/server";

const getRegistrationKey = () =>
  process.env.PYSYNC_REGISTRATION_KEY || process.env.PYSYNC_API_KEY || "";

const isAuthorized = (authorization: string | null) => {
  const expectedKey = getRegistrationKey();
  const suppliedKey = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  const expectedBuffer = Buffer.from(expectedKey);
  const suppliedBuffer = Buffer.from(suppliedKey);

  return (
    expectedBuffer.length > 0 &&
    expectedBuffer.length === suppliedBuffer.length &&
    timingSafeEqual(expectedBuffer, suppliedBuffer)
  );
};

const getRequestIp = (req: NextRequest) => {
  const candidates = [
    req.headers.get("cf-connecting-ip"),
    req.headers.get("x-real-ip"),
    req.headers.get("x-forwarded-for")?.split(",")[0],
  ];

  for (const candidate of candidates) {
    const address = candidate?.trim().replace(/^::ffff:/, "") || "";
    if (isIP(address)) return address;
  }

  return null;
};

export const POST = async (req: NextRequest) => {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return buildErrorResponse(
      "NOT_AUTHORIZED",
      "Invalid pySync registration token.",
      [],
      401,
    );
  }

  const publicIp = getRequestIp(req);
  if (!publicIp) {
    return buildErrorResponse(
      "IP_ADDRESS_NOT_FOUND",
      "Unable to determine the pySync server IP address.",
      [],
      400,
    );
  }

  let body: { serverName?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    // Nama server opsional; IP tetap berasal dari request yang tervalidasi.
  }

  const requestedName =
    typeof body.serverName === "string" ? body.serverName.trim() : "";

  if (requestedName.length > 100) {
    return buildErrorResponse(
      "VALIDATION_ERROR",
      "Server name must not exceed 100 characters.",
      [],
      400,
    );
  }

  try {
    const existingServer = await prisma.server.findFirst({
      where: { ipAddress: publicIp },
      select: {
        id: true,
        ipAddress: true,
        domain: true,
      },
    });

    if (existingServer) {
      let hostname = existingServer.domain;

      // Server dapat sudah tercatat sebelum konfigurasi Cloudflare tersedia.
      // Registrasi ulang harus melengkapi domain yang masih kosong, bukan
      // langsung mengembalikan sukses dengan hostname null.
      if (!hostname) {
        const ipVersion = isIP(publicIp);
        if (ipVersion !== 4 && ipVersion !== 6) {
          throw new Error("Unsupported public IP address.");
        }

        hostname = await upsertPySyncDnsRecord(
          existingServer.id,
          publicIp,
          ipVersion,
        );
        await prisma.server.update({
          where: { id: existingServer.id },
          data: {
            domain: hostname,
            status: 1,
            updatedBy: "pysync-registration",
          },
        });
      }

      return buildResponse({
        serverId: existingServer.id,
        hostname,
        ipAddress: existingServer.ipAddress,
        registered: true,
        alreadyRegistered: true,
      });
    }

    const server = await prisma.server.create({
      data: {
        name: requestedName || `VPS ${publicIp}`,
        ipAddress: publicIp,
        status: 1,
        orderNumber: 9999,
        createdBy: "pysync-registration",
        updatedBy: "pysync-registration",
      },
    });

    const ipVersion = isIP(publicIp);
    if (ipVersion !== 4 && ipVersion !== 6) {
      throw new Error("Unsupported public IP address.");
    }

    const hostname = await upsertPySyncDnsRecord(
      server.id,
      publicIp,
      ipVersion,
    );
    const registeredServer = await prisma.server.update({
      where: { id: server.id },
      data: {
        domain: hostname,
        ...(!requestedName ? { name: `VPS #${server.id}` } : {}),
        status: 1,
        updatedBy: "pysync-registration",
      },
    });

    return buildResponse({
      serverId: registeredServer.id,
      hostname: registeredServer.domain,
      ipAddress: registeredServer.ipAddress,
      registered: true,
    });
  } catch (error) {
    console.error("REGISTER_PYSYNC_SERVER_ERROR:", error);
    return buildErrorResponse(
      "REGISTER_SERVER_FAILED",
      "Failed to register the pySync server.",
      [],
      500,
    );
  }
};
