import Image from "next/image";
import LoginForm from "../../components/LoginForm";

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020713] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(0,217,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.035)_1px,transparent_1px)] bg-size-[44px_44px]" />
      <div className="pointer-events-none absolute left-[10%] top-16 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-12 right-[10%] h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex justify-center">
            <Image
              src="/images/logo.png"
              alt="CuanHero"
              width={230}
              height={80}
              priority
              className="h-auto w-56"
            />
          </div>

          <div className="rounded-2xl border border-cyan-400/25 bg-[linear-gradient(145deg,rgba(7,18,37,0.92),rgba(4,8,20,0.96))] p-6 shadow-[0_0_0_1px_rgba(0,217,255,0.08),0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
