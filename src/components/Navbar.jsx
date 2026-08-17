import { NavLink } from "react-router-dom"

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
]

export default function Navbar() {
  return (
    <nav className="bg-white shadow-md px-8 py-4 flex items-center justify-between">
      <span className="text-xl font-bold text-blue-600">MyApp</span>
      <ul className="flex gap-6">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end
              className={({ isActive }) =>
                `text-sm font-medium transition hover:text-blue-600 ${
                  isActive ? "text-blue-600 underline" : "text-gray-600"
                }`
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}