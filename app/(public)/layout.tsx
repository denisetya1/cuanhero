import Header from "./components/Header";
import Footer from "./components/Footer";
import ExnessBanner from "./components/ExnessBanner";

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-ch-bg text-ch-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(0,217,255,0.18),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(217,70,239,0.14),transparent_24%),radial-gradient(circle_at_50%_62%,rgba(255,214,102,0.08),transparent_34%),linear-gradient(180deg,rgba(0,5,13,0.2),#00050d_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-size-[56px_56px] opacity-50" />
      <div className="landing-scanline" aria-hidden="true" />
      <Header />

      <main className="relative z-10 grow bg-transparent">{children}</main>

      <ExnessBanner />
      <Footer />
    </div>
  );
};

export default Layout;
