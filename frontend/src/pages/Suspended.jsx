import { useAuth } from "../context/AuthContext";
import { Button } from "../components/Form";
import { useNavigate } from "react-router-dom";

export default function Suspended() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-red-900/50 bg-stone-900/60 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950/60 text-red-400">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9l6 6M15 9l-6 6" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="mb-2 text-lg font-semibold text-stone-50">Your account has been suspended</h1>
        <p className="mb-6 text-sm text-stone-400">
          An administrator has restricted access to your account and stopped any running instances.
          Contact the admin team on Discord to find out why and get reinstated.
        </p>
        <a
          href="https://discord.gg/wf9NVXa3xF"
          target="_blank"
          rel="noreferrer"
          className="mb-3 inline-block w-full rounded-lg bg-moss-500 px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-moss-400"
        >
          Contact support on Discord
        </a>
        <Button variant="ghost" className="w-full" onClick={handleLogout}>
          Log out
        </Button>
      </div>
    </div>
  );
}
