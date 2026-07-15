// app/(public)/login/page.tsx
import RegisterForm from "../../components/RegisterForm"; // Sesuaikan dengan jalur folder komponenmu

export default function LoginPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 bg-[#030712]">
      <div className="w-full max-w-sm border border-slate-800 bg-[#090d16] p-2 rounded-2xl shadow-2xl">
        {/* Memanggil Form Credentials Better Auth */}
        <RegisterForm />
      </div>
    </div>
  );
}
