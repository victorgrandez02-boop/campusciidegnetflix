import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import BrandLogo from './BrandLogo';
import { DashboardTab, NotificationItem, User, UserRole } from '../types';

interface NavbarProps {
  user: User | null;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  onSearch: (query: string) => void;
  notifications: NotificationItem[];
  onNotificationRead: (notificationId: string) => void;
  onOpenAdmin: () => void;
  onOpenTeacher: () => void;
  onLogout: () => void;
}

const tabs: Array<{ id: DashboardTab; label: string }> = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'mis-cursos', label: 'Mis cursos' },
  { id: 'explorar', label: 'Explorar' },
  { id: 'certificados', label: 'Certificados' },
];

const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  onTabChange,
  onSearch,
  notifications,
  onNotificationRead,
  onOpenAdmin,
  onOpenTeacher,
  onLogout,
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => onSearch(search), 250);
    return () => window.clearTimeout(timeout);
  }, [search, onSearch]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'border-b border-white/10 bg-[#07121D]/95 backdrop-blur-xl'
          : 'bg-gradient-to-b from-black via-black/70 to-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-10">
        <div className="flex min-w-0 items-center gap-6">
          <button
            type="button"
            onClick={() => onTabChange('inicio')}
            className="text-left"
            aria-label="Volver al inicio"
          >
            <BrandLogo className="w-40 md:w-48" />
          </button>

          <nav className="hidden items-center gap-2 lg:flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-2 transition-all ${
              showSearch ? 'w-64 md:w-80' : 'w-11'
            }`}
          >
            <button
              type="button"
              onClick={() => setShowSearch((current) => !current)}
              className="text-gray-300 transition hover:text-white"
            >
              <Search className="h-5 w-5" />
            </button>
            {showSearch && (
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Busca cursos, categorias o docentes"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-gray-500"
              />
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative rounded-full border border-white/10 bg-black/30 p-2.5 text-gray-300 transition hover:text-white"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-[#003F6F] px-1 text-center text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-2xl">
                <div className="border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Notificaciones</p>
                  <p className="text-xs text-gray-400">Actividad reciente de tu campus</p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-400">
                      No tienes notificaciones nuevas.
                    </div>
                  ) : (
                    notifications.slice(0, 8).map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          onNotificationRead(notification.id);
                          setShowNotifications(false);
                        }}
                        className={`w-full border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/5 ${
                          notification.isRead ? 'opacity-70' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">{notification.title}</p>
                            <p className="mt-1 text-xs text-gray-400">{notification.message}</p>
                          </div>
                          {!notification.isRead && (
                            <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-sky-400" />
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfile((current) => !current)}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 p-1.5 pl-2 text-white transition hover:border-white/20"
            >
              <img
                src={user?.avatar}
                alt={user?.fullName}
                className="h-9 w-9 rounded-full object-cover"
              />
              <span className="hidden max-w-[140px] truncate text-sm font-medium md:block">
                {user?.fullName}
              </span>
              <ChevronDown className="mr-1 h-4 w-4 text-gray-400" />
            </button>

            {showProfile && (
              <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#171717] shadow-2xl">
                <div className="border-b border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-sm font-semibold text-white">{user?.fullName}</p>
                  <p className="mt-1 text-xs text-gray-400">{user?.email}</p>
                  <p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-gray-200">
                    {user?.role === UserRole.ADMIN
                      ? 'Administrador'
                      : user?.role === UserRole.GESTOR
                        ? 'Gestor'
                      : user?.role === UserRole.DOCENTE
                        ? 'Docente'
                        : 'Estudiante'}
                  </p>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('mis-cursos');
                      setShowProfile(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <GraduationCap className="h-4 w-4" />
                    Mis cursos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTabChange('certificados');
                      setShowProfile(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                  >
                    <Sparkles className="h-4 w-4" />
                    Certificados
                  </button>

                  {(user?.role === UserRole.DOCENTE || user?.role === UserRole.GESTOR) && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTeacher();
                        setShowProfile(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                    >
                    <LayoutDashboard className="h-4 w-4" />
                    {user?.role === UserRole.GESTOR ? 'Panel gestor' : 'Panel docente'}
                  </button>
                )}

                  {user?.role === UserRole.ADMIN && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenAdmin();
                        setShowProfile(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-gray-300 transition hover:bg-white/5 hover:text-white"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Panel administrador
                    </button>
                  )}

                  <div className="my-2 border-t border-white/10" />

                  <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
