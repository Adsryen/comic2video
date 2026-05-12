import { Link } from "react-router-dom";
import { Github, Mail, FolderKanban, BookOpen, Home } from "lucide-react";

const Footer = () => {
  const quickLinks = [
    { name: "Home", link: "/", icon: Home },
    { name: "Platform", link: "/projects", icon: FolderKanban },
    { name: "Docs", link: "/docs", icon: BookOpen },
    { name: "Contact", link: "/contact", icon: Mail },
  ];

  return (
    <footer className="relative z-10 mt-20 border-t border-white/10 bg-black/30 px-6 py-12 text-gray-300 backdrop-blur">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <img src="/manhwa-logo.png" alt="Platform Logo" className="h-10 w-10 object-contain" />
              <span className="text-xl font-bold text-white">PLATFORM</span>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-gray-400">
              A comic-to-video workflow platform for uploading PDF and CBZ sources, creating jobs,
              inspecting generated assets, and iterating toward a full narrated video pipeline.
            </p>
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Quick Links
            </div>
            <div className="grid gap-3">
              {quickLinks.map((item) => (
                <Link
                  key={item.link}
                  to={item.link}
                  className="inline-flex items-center gap-2 text-sm text-gray-300 transition hover:text-white"
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} PLATFORM</p>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 transition hover:text-white"
          >
            <Github className="h-4 w-4" />
            Repository
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
