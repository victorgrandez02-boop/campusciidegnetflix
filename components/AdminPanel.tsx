import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import {
  AdminSnapshot,
  Course,
  Enrollment,
  EnrollmentStatus,
  SupportRequest,
  User,
  UserRole,
} from '../types';
import SystemSettingsTab from './SystemSettingsTab';

interface AdminPanelProps {
  currentUser: User;
  onExit: () => void;
  onLogout: () => void;
}

type AdminTab = 'resumen' | 'usuarios' | 'cursos' | 'inscripciones' | 'soporte' | 'configuracion';

const emptyMetrics: AdminSnapshot = {
  totalUsers: 0,
  totalTeachers: 0,
  totalStudents: 0,
  totalCourses: 0,
  activeEnrollments: 0,
  completedEnrollments: 0,
  certificatesIssued: 0,
};

const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onExit, onLogout }) => {
  const [tab, setTab] = useState<AdminTab>('resumen');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [metrics, setMetrics] = useState<AdminSnapshot>(emptyMetrics);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: UserRole.ALUMNO,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, coursesData, enrollmentsData, supportData] = await Promise.all([
        api.getUsers(),
        api.getCourses(),
        api.getAllEnrollments(),
        api.getSupportRequests(),
      ]);

      setUsers(usersData);
      setCourses(coursesData);
      setEnrollments(enrollmentsData);
      setSupportRequests(supportData);
      setMetrics({
        totalUsers: usersData.length,
        totalTeachers: usersData.filter((user) => user.role === UserRole.DOCENTE).length,
        totalStudents: usersData.filter((user) => user.role === UserRole.ALUMNO).length,
        totalCourses: coursesData.length,
        activeEnrollments: enrollmentsData.filter(
          (enrollment) => enrollment.status === EnrollmentStatus.ACTIVE,
        ).length,
        completedEnrollments: enrollmentsData.filter(
          (enrollment) => enrollment.status === EnrollmentStatus.COMPLETED,
        ).length,
        certificatesIssued: enrollmentsData.filter(
          (enrollment) => enrollment.status === EnrollmentStatus.COMPLETED,
        ).length,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newUser.fullName.trim() || !newUser.email.trim() || newUser.password.length < 6) {
      return;
    }

    setSaving(true);
    try {
      await api.createUser({
        fullName: newUser.fullName,
        email: newUser.email,
        phone: newUser.phone,
        password: newUser.password,
        role: newUser.role,
      });
      setNewUser({ fullName: '', email: '', phone: '', password: '', role: UserRole.ALUMNO });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUserField = async (userId: string, field: 'fullName' | 'email' | 'phone', value: string) => {
    setSaving(true);
    try {
      const user = users.find((item) => item.id === userId);
      if (!user) return;
      await api.updateUser(userId, { ...user, [field]: value });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleResetStudentPassword = async (userId: string) => {
    setSaving(true);
    try {
      await api.resetStudentPassword(userId);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleEnrollmentStatus = async (enrollmentId: string | undefined, status: EnrollmentStatus) => {
    if (!enrollmentId) return;
    setSaving(true);
    try {
      await api.updateEnrollmentStatus(enrollmentId, status);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleSupportReset = async (requestId: string) => {
    setSaving(true);
    try {
      await api.resetSupportRequestPassword(requestId, currentUser.id);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (userId: string, role: UserRole) => {
    setSaving(true);
    try {
      const user = users.find((item) => item.id === userId);
      if (!user) {
        return;
      }

      await api.updateUser(userId, { ...user, role });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setSaving(true);
    try {
      await api.deleteUser(userId);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (course: Course) => {
    setSaving(true);
    try {
      await api.updateCourse(course.id, {
        title: course.title,
        description: course.description,
        coverImage: course.coverImage,
        posterImage: course.posterImage,
        price: course.price,
        duration: course.duration,
        level: course.level,
        category: course.category,
        instructor: course.instructor,
        instructorId: course.instructorId,
        isFeatured: !course.isFeatured,
      });
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    setSaving(true);
    try {
      await api.deleteCourse(courseId);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101010] text-white">
        Cargando panel administrador...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#101010] text-white">
      <div className="border-b border-white/10 bg-gradient-to-r from-slate-950 via-[#101010] to-[#101010]">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-6 px-4 py-8 md:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-sky-400">Panel administrador</p>
              <h1 className="mt-2 text-3xl font-bold">Operacion del campus</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Gestiona usuarios, cursos e inscripciones del campus CIIDEG.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadData}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <RefreshCcw className="mr-2 inline h-4 w-4" />
                Actualizar
              </button>
              <button
                type="button"
                onClick={onExit}
                className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black"
              >
                Volver al campus
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
              >
                <LogOut className="mr-2 inline h-4 w-4" />
                Cerrar sesion
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setTab('resumen')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === 'resumen' ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              Resumen
            </button>
            <button
              type="button"
              onClick={() => setTab('usuarios')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === 'usuarios' ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              Usuarios
            </button>
            <button
              type="button"
              onClick={() => setTab('cursos')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === 'cursos' ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              Cursos
            </button>
            <button
              type="button"
              onClick={() => setTab('inscripciones')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === 'inscripciones' ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              Inscripciones
            </button>
            <button
              type="button"
              onClick={() => setTab('soporte')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === 'soporte' ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              Solicitudes de Soporte
            </button>
            <button
              type="button"
              onClick={() => setTab('configuracion')}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === 'configuracion' ? 'bg-white text-black' : 'bg-white/5 text-gray-300'
              }`}
            >
              Configuración
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-8 md:px-10">
        {tab === 'resumen' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-[#171717] p-5">
                <Users className="h-8 w-8 text-sky-400" />
                <p className="mt-4 text-sm text-gray-400">Usuarios totales</p>
                <p className="mt-2 text-3xl font-bold">{metrics.totalUsers}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#171717] p-5">
                <BookOpen className="h-8 w-8 text-emerald-400" />
                <p className="mt-4 text-sm text-gray-400">Cursos activos</p>
                <p className="mt-2 text-3xl font-bold">{metrics.totalCourses}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#171717] p-5">
                <GraduationCap className="h-8 w-8 text-amber-400" />
                <p className="mt-4 text-sm text-gray-400">Inscripciones activas</p>
                <p className="mt-2 text-3xl font-bold">{metrics.activeEnrollments}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-[#171717] p-5">
                <ShieldCheck className="h-8 w-8 text-violet-400" />
                <p className="mt-4 text-sm text-gray-400">Certificados emitidos</p>
                <p className="mt-2 text-3xl font-bold">{metrics.certificatesIssued}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-[#171717] p-6">
                <h2 className="text-xl font-semibold">Distribucion por rol</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Estudiantes</span>
                      <span>{metrics.totalStudents}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-sky-500"
                        style={{
                          width: `${metrics.totalUsers ? (metrics.totalStudents / metrics.totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span>Docentes</span>
                      <span>{metrics.totalTeachers}</span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-emerald-500"
                        style={{
                          width: `${metrics.totalUsers ? (metrics.totalTeachers / metrics.totalUsers) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#171717] p-6">
                <h2 className="text-xl font-semibold">Cursos destacados</h2>
                <div className="mt-5 space-y-3">
                  {courses
                    .filter((course) => course.isFeatured)
                    .slice(0, 4)
                    .map((course) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-white">{course.title}</p>
                          <p className="text-sm text-gray-400">{course.instructor}</p>
                        </div>
                        <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
                          Destacado
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'usuarios' && (
          <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
            <form
              onSubmit={handleCreateUser}
              className="rounded-3xl border border-white/10 bg-[#171717] p-6"
            >
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-sky-400" />
                <h2 className="text-xl font-semibold">Crear usuario</h2>
              </div>

              <div className="mt-6 space-y-4">
                <input
                  value={newUser.fullName}
                  onChange={(event) =>
                    setNewUser((current) => ({ ...current, fullName: event.target.value }))
                  }
                  placeholder="Nombre completo"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
                />
                <input
                  value={newUser.email}
                  onChange={(event) =>
                    setNewUser((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="Correo electronico"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
                />
                <input
                  value={newUser.phone}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      phone: event.target.value.replace(/\D/g, '').slice(0, 9),
                    }))
                  }
                  placeholder="Telefono peruano"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
                />
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(event) =>
                    setNewUser((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Contrasena inicial"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
                />
                <select
                  value={newUser.role}
                  onChange={(event) =>
                    setNewUser((current) => ({
                      ...current,
                      role: event.target.value as UserRole,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                >
                  <option value={UserRole.ALUMNO}>Estudiante</option>
                  <option value={UserRole.DOCENTE}>Docente</option>
                  <option value={UserRole.GESTOR}>Gestor</option>
                  <option value={UserRole.ADMIN}>Administrador</option>
                </select>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-2xl bg-white px-4 py-3 font-semibold text-black disabled:opacity-60"
                >
                  Crear usuario
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-white/10 bg-[#171717] p-6">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-6 w-6 text-emerald-400" />
                <h2 className="text-xl font-semibold">Gestion de usuarios</h2>
              </div>
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="text-gray-400">
                    <tr>
                      <th className="pb-3">Usuario</th>
                      <th className="pb-3">Telefono</th>
                      <th className="pb-3">Rol</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-t border-white/5">
                        <td className="py-4">
                          <input
                            value={user.fullName}
                            onChange={(event) =>
                              setUsers((current) =>
                                current.map((item) =>
                                  item.id === user.id ? { ...item, fullName: event.target.value } : item,
                                ),
                              )
                            }
                            onBlur={(event) => handleUpdateUserField(user.id, 'fullName', event.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 font-medium text-white outline-none"
                          />
                          <input
                            value={user.email}
                            onChange={(event) =>
                              setUsers((current) =>
                                current.map((item) =>
                                  item.id === user.id ? { ...item, email: event.target.value } : item,
                                ),
                              )
                            }
                            onBlur={(event) => handleUpdateUserField(user.id, 'email', event.target.value)}
                            className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-gray-300 outline-none"
                          />
                        </td>
                        <td className="py-4">
                          <input
                            value={user.phone || ''}
                            onChange={(event) =>
                              setUsers((current) =>
                                current.map((item) =>
                                  item.id === user.id
                                    ? { ...item, phone: event.target.value.replace(/\D/g, '').slice(0, 9) }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(event) => handleUpdateUserField(user.id, 'phone', event.target.value)}
                            className="w-32 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
                          />
                        </td>
                        <td className="py-4">
                          <select
                            value={user.role}
                            onChange={(event) =>
                              handleRoleChange(user.id, event.target.value as UserRole)
                            }
                            className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white outline-none"
                          >
                            <option value={UserRole.ALUMNO}>Estudiante</option>
                            <option value={UserRole.DOCENTE}>Docente</option>
                            <option value={UserRole.GESTOR}>Gestor</option>
                            <option value={UserRole.ADMIN}>Administrador</option>
                          </select>
                        </td>
                        <td className="py-4">
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
                            Activo
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={saving || user.role === UserRole.ADMIN}
                            className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-red-200 transition hover:bg-red-500/20 disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {user.role === UserRole.ALUMNO && (
                            <button
                              type="button"
                              onClick={() => handleResetStudentPassword(user.id)}
                              disabled={saving}
                              className="ml-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-amber-100 transition hover:bg-amber-500/20 disabled:opacity-40"
                              title="Resetear a Temporal123"
                            >
                              <KeyRound className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'cursos' && (
          <div className="rounded-3xl border border-white/10 bg-[#171717] p-6">
            <h2 className="text-xl font-semibold">Gestion de cursos</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {courses.map((course) => (
                <article
                  key={course.id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-black/20"
                >
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="h-44 w-full object-cover"
                  />
                  <div className="space-y-4 p-5">
                    <div>
                      <p className="text-lg font-semibold text-white">{course.title}</p>
                      <p className="mt-1 text-sm text-gray-400">{course.instructor}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                      <span className="rounded-full bg-white/10 px-3 py-1">{course.category}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">{course.level}</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">
                        {course.enrolledStudents || 0} inscritos
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleFeatured(course)}
                        disabled={saving}
                        className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
                      >
                        {course.isFeatured ? 'Quitar destacado' : 'Marcar destacado'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCourse(course.id)}
                        disabled={saving}
                        className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-60"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {tab === 'inscripciones' && (
          <div className="rounded-3xl border border-white/10 bg-[#171717] p-6">
            <h2 className="text-xl font-semibold">Seguimiento de inscripciones</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="pb-3">Curso</th>
                    <th className="pb-3">Alumno</th>
                    <th className="pb-3">Progreso</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((enrollment) => {
                    const student = users.find((user) => user.id === enrollment.userId);
                    return (
                      <tr key={enrollment.id || `${enrollment.userId}-${enrollment.courseId}`} className="border-t border-white/5">
                        <td className="py-4">
                          <p className="font-medium text-white">{enrollment.course?.title}</p>
                          <p className="text-xs text-gray-500">{enrollment.course?.category}</p>
                        </td>
                        <td className="py-4">
                          <p className="text-white">{student?.fullName}</p>
                          <p className="text-xs text-gray-500">{student?.email}</p>
                        </td>
                        <td className="py-4">
                          <div className="w-40">
                            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${enrollment.progress}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-gray-400">{enrollment.progress}%</p>
                          </div>
                        </td>
                        <td className="py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs ${
                              enrollment.status === EnrollmentStatus.COMPLETED
                                ? 'bg-emerald-500/10 text-emerald-200'
                                : 'bg-sky-500/10 text-sky-200'
                            }`}
                          >
                            {enrollment.status === EnrollmentStatus.COMPLETED
                              ? 'Completado'
                              : enrollment.status === EnrollmentStatus.PENDING
                                ? 'Pendiente'
                                : enrollment.status === EnrollmentStatus.PENDING_PAYMENT
                                  ? 'Pago pendiente'
                                  : 'Activo'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          {(enrollment.status === EnrollmentStatus.PENDING ||
                            enrollment.status === EnrollmentStatus.PENDING_PAYMENT) && (
                            <button
                              type="button"
                              onClick={() => handleEnrollmentStatus(enrollment.id, EnrollmentStatus.ACTIVE)}
                              disabled={saving}
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
                            >
                              Aprobar acceso
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'soporte' && (
          <div className="rounded-3xl border border-white/10 bg-[#171717] p-6">
            <h2 className="text-xl font-semibold">Solicitudes de Soporte</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="pb-3">Alumno</th>
                    <th className="pb-3">Correo</th>
                    <th className="pb-3">Fecha</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {supportRequests.map((request) => (
                    <tr key={request.id} className="border-t border-white/5">
                      <td className="py-4 text-white">{request.userName || 'No identificado'}</td>
                      <td className="py-4 text-gray-300">{request.email}</td>
                      <td className="py-4 text-gray-400">
                        {new Date(request.createdAt).toLocaleString('es-PE')}
                      </td>
                      <td className="py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs ${
                            request.status === 'pending'
                              ? 'bg-amber-500/10 text-amber-200'
                              : 'bg-emerald-500/10 text-emerald-200'
                          }`}
                        >
                          {request.status === 'pending' ? 'Pendiente' : 'Atendida'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {request.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleSupportReset(request.id)}
                            disabled={saving}
                            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black transition hover:bg-amber-400 disabled:opacity-60"
                          >
                            Resetear a Temporal123
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'configuracion' && (
          <SystemSettingsTab onSettingsUpdate={loadData} />
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
