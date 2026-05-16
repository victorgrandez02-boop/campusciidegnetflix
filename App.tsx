import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import AdminPanel from "./components/AdminPanel";
import BrandLogo from "./components/BrandLogo";
import CourseDetailModal from "./components/CourseDetailModal";
import CourseRow from "./components/CourseRow";
import DocentePanel from "./components/DocentePanel";
import GestorPanel from "./components/GestorPanel";
import CourseLandingPage from "./components/CourseLandingPage";
import PaymentModal from "./components/PaymentModal";
import Hero from "./components/Hero";
import Navbar from "./components/Navbar";
import Player from "./components/Player";
import { ToastProvider, useToast } from "./components/ToastContext";
import { api } from "./services/api";
import {
  Certificate,
  Course,
  DashboardTab,
  Enrollment,
  EnrollmentStatus,
  FilterState,
  LessonProgress,
  LoginFormData,
  NotificationItem,
  RegisterFormData,
  SystemSettings,
  User,
  UserRole,
  View,
} from "./types";

const defaultFilters: FilterState = {
  search: "",
  category: "all",
  level: "all",
  sort: "featured",
};

const defaultLoginForm: LoginFormData = {
  email: "",
  password: "",
};

const defaultRegisterForm: RegisterFormData = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  role: UserRole.ALUMNO,
  honeypot: "",
  formStartedAt: Date.now(),
};

const isEnrolledStatus = (status?: EnrollmentStatus) =>
  status === EnrollmentStatus.ACTIVE || status === EnrollmentStatus.COMPLETED;

const sortCourses = (courses: Course[], sort: FilterState["sort"]) => {
  const next = [...courses];

  switch (sort) {
    case "rating":
      return next.sort((a, b) => b.rating - a.rating);
    case "newest":
      return next.sort((a, b) =>
        (b.createdAt || "").localeCompare(a.createdAt || ""),
      );
    case "price-asc":
      return next.sort((a, b) => a.price - b.price);
    case "price-desc":
      return next.sort((a, b) => b.price - a.price);
    case "featured":
    default:
      return next.sort(
        (a, b) =>
          Number(b.isFeatured) - Number(a.isFeatured) || b.rating - a.rating,
      );
  }
};

const applyFilters = (courses: Course[], filters: FilterState) =>
  sortCourses(
    courses.filter((course) => {
      const search = filters.search.trim().toLowerCase();
      const matchesSearch =
        search.length === 0 ||
        course.title.toLowerCase().includes(search) ||
        course.category.toLowerCase().includes(search) ||
        course.instructor.toLowerCase().includes(search);
      const matchesCategory =
        filters.category === "all" || course.category === filters.category;
      const matchesLevel =
        filters.level === "all" || course.level === filters.level;

      return matchesSearch && matchesCategory && matchesLevel;
    }),
    filters.sort,
  );

const App: React.FC = () => (
  <ToastProvider>
    <CampusApp />
  </ToastProvider>
);

const CampusApp: React.FC = () => {
  const { addToast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.LOGIN);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>("inicio");
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [loginForm, setLoginForm] = useState<LoginFormData>(defaultLoginForm);
  const [registerForm, setRegisterForm] =
    useState<RegisterFormData>(defaultRegisterForm);
  const [isBooting, setIsBooting] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [passwordChangeForm, setPasswordChangeForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(
    null,
  );
  const [landingCourseId, setLandingCourseId] = useState<string | null>(null);
  const [paymentCourse, setPaymentCourse] = useState<Course | null>(null);

  const loadCourses = async () => {
    const data = await api.getCourses();
    setCourses(data);
  };

  const loadUserContext = async (
    user: User | null,
    keepPlayerState = false,
  ) => {
    if (!user) {
      setEnrollments([]);
      setNotifications([]);
      setCertificates([]);
      setLessonProgress([]);
      if (!keepPlayerState) {
        setActiveCourse(null);
      }
      return;
    }

    const [enrollmentData, notificationData, certificateData] =
      await Promise.all([
        api.getEnrollments(user.id),
        api.getNotifications(user.id),
        api.getCertificates(user.id),
      ]);

    setEnrollments(enrollmentData);
    setNotifications(notificationData);
    setCertificates(certificateData);

    if (keepPlayerState && activeCourse) {
      const progress = await api.getLessonProgressForCourse(
        user.id,
        activeCourse.id,
      );
      setLessonProgress(progress);
    } else {
      setLessonProgress([]);
    }
  };

  const restoreSession = async () => {
    const [sessionUser, settingsData] = await Promise.all([
      api.getCurrentSessionUser(),
      api.getSystemSettings(),
      loadCourses(),
    ]);

    setSystemSettings(settingsData);

    if (sessionUser) {
      setCurrentUser(sessionUser);
      let view = View.DASHBOARD;
      if (sessionUser.mustChangePassword) view = View.CHANGE_PASSWORD;
      else if (sessionUser.role === UserRole.ADMIN) view = View.ADMIN;
      else if (sessionUser.role === UserRole.DOCENTE) view = View.DOCENTE;
      else if (sessionUser.role === UserRole.GESTOR) view = View.GESTOR;

      // Handle hash routing override even if logged in
      const hash = window.location.hash;
      if (hash.startsWith("#curso-")) {
        const courseId = hash.replace("#curso-", "");
        setLandingCourseId(courseId);
        view = View.COURSE_LANDING;
      }

      setCurrentView(view);
      await loadUserContext(sessionUser);
    } else {
      // Check hash routing if not logged in
      const hash = window.location.hash;
      if (hash.startsWith("#curso-")) {
        const courseId = hash.replace("#curso-", "");
        setLandingCourseId(courseId);
        setCurrentView(View.COURSE_LANDING);
      }
    }
  };

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await restoreSession();
      } catch (error) {
        console.error(error);
        addToast("No se pudo restaurar la sesion previa.", "warning");
      } finally {
        setIsBooting(false);
      }
    };

    bootstrap();
  }, []);

  useEffect(() => {
    if (systemSettings) {
      document.documentElement.style.setProperty(
        "--primary-color",
        systemSettings.primaryColor,
      );
      document.documentElement.style.setProperty(
        "--secondary-color",
        systemSettings.secondaryColor,
      );
      document.documentElement.style.setProperty(
        "--accent-color",
        systemSettings.accentColor,
      );
    }
  }, [systemSettings]);

  const navigateToRoleHome = (user: User) => {
    if (user.mustChangePassword) {
      setCurrentView(View.CHANGE_PASSWORD);
      return;
    }

    if (landingCourseId) {
      setCurrentView(View.COURSE_LANDING);
      return;
    }

    if (user.role === UserRole.ADMIN) {
      setCurrentView(View.ADMIN);
      return;
    }
    if (user.role === UserRole.GESTOR) {
      setCurrentView(View.GESTOR);
      return;
    }
    if (user.role === UserRole.DOCENTE) {
      setCurrentView(View.DOCENTE);
      return;
    }

    setCurrentView(View.DASHBOARD);
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsBusy(true);
    setAuthError(null);

    try {
      const user = await api.loginWithCredentials(
        loginForm.email,
        loginForm.password,
      );
      setCurrentUser(user);
      await loadUserContext(user);
      navigateToRoleHome(user);
      addToast(`Sesion iniciada como ${user.fullName}.`, "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible iniciar sesion.";
      setAuthError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!registerForm.fullName.trim() || !registerForm.email.trim()) {
      setAuthError("Completa nombre y correo para crear la cuenta.");
      return;
    }

    if (!/^9\d{8}$/.test(registerForm.phone.trim())) {
      setAuthError("Ingresa un telefono peruano valido de 9 digitos.");
      return;
    }

    if (registerForm.password.length < 6) {
      setAuthError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setAuthError("Las contrasenas no coinciden.");
      return;
    }

    setIsBusy(true);
    setAuthError(null);

    try {
      const user = await api.register({
        fullName: registerForm.fullName,
        email: registerForm.email,
        phone: registerForm.phone,
        password: registerForm.password,
        role: UserRole.ALUMNO,
        honeypot: registerForm.honeypot,
        formStartedAt: registerForm.formStartedAt,
      });
      setCurrentUser(user);
      await loadCourses();
      await loadUserContext(user);
      navigateToRoleHome(user);
      setRegisterForm({ ...defaultRegisterForm, formStartedAt: Date.now() });
      addToast("Cuenta creada correctamente.", "success");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible crear la cuenta.";
      setAuthError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = loginForm.email.trim().toLowerCase();
    try {
      await api.createSupportRequest(email);
      addToast("Solicitud registrada. Completa tu correo en WhatsApp para continuar.", "info");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo registrar la solicitud.";
      setAuthError(message);
      return;
    }

    const whatsappUrl =
      "https://wa.me/51936220771?text=Hola%20CIIDEG,%20necesito%20resetear%20mi%20clave.%20Mi%20correo%20es:%20" +
      encodeURIComponent(email);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleChangePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser) return;

    if (passwordChangeForm.newPassword.length < 6) {
      setAuthError("La nueva contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
      setAuthError("Las contrasenas no coinciden.");
      return;
    }

    setIsBusy(true);
    setAuthError(null);
    try {
      const user = await api.changePassword(
        currentUser.id,
        passwordChangeForm.currentPassword,
        passwordChangeForm.newPassword,
      );
      setCurrentUser(user);
      setPasswordChangeForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      await loadUserContext(user);
      navigateToRoleHome(user);
      addToast("Contrasena actualizada correctamente.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo cambiar la contrasena.";
      setAuthError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentView(View.LOGIN);
    setDashboardTab("inicio");
    setSelectedCourse(null);
    setActiveCourse(null);
    setFilters(defaultFilters);
    setLoginForm(defaultLoginForm);
    setRegisterForm({ ...defaultRegisterForm, formStartedAt: Date.now() });
    await loadUserContext(null);
  };

  const navigateToDashboard = async () => {
    if (!currentUser) {
      setCurrentView(View.LOGIN);
      return;
    }

    // Clear hash
    window.history.pushState(
      "",
      document.title,
      window.location.pathname + window.location.search,
    );
    setLandingCourseId(null);
    await loadCourses();
    await loadUserContext(currentUser);
    setDashboardTab("inicio");
    setCurrentView(View.DASHBOARD);
  };

  const openRolePanel = () => {
    if (!currentUser) return;
    if (currentUser.role === UserRole.ADMIN) {
      setCurrentView(View.ADMIN);
      return;
    }
    if (currentUser.role === UserRole.GESTOR) {
      setCurrentView(View.GESTOR);
      return;
    }
    if (currentUser.role === UserRole.DOCENTE) {
      setCurrentView(View.DOCENTE);
    }
  };

  const openPlayer = async (course: Course) => {
    if (!currentUser) {
      return;
    }

    const [fullCourse, progressEntries] = await Promise.all([
      api.getCourse(course.id),
      api.getLessonProgressForCourse(currentUser.id, course.id),
    ]);

    setActiveCourse(fullCourse);
    setLessonProgress(progressEntries);
    setSelectedCourse(null);
    setCurrentView(View.PLAYER);
  };

  const handlePlayCourse = async (courseId: string) => {
    const course = courses.find((item) => item.id === courseId);
    if (!course || !currentUser) {
      return;
    }

    setIsBusy(true);

    try {
      if (currentUser.role === UserRole.ALUMNO) {
        const enrollment = enrollments.find(
          (item) => item.courseId === courseId,
        );
        if (!enrollment) {
          if (course.price === 0) {
            await handleEnroll(course, true);
            return;
          }
          if (currentView === View.COURSE_LANDING) {
            setPaymentCourse(course);
          } else {
            setSelectedCourse(course);
          }
          addToast(
            "Inscríbete al curso para habilitar la reproducción.",
            "info",
          );
          return;
        }
        if (!isEnrolledStatus(enrollment.status)) {
          addToast("Tu acceso al curso esta pendiente de aprobacion.", "info");
          return;
        }
      }

      await openPlayer(course);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo abrir el curso.";
      addToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleEnroll = async (course: Course, openAfter = false) => {
    if (!currentUser) {
      setLandingCourseId(course.id);
      setCurrentView(View.REGISTER);
      return;
    }

    if (course.price > 0) {
      setSelectedCourse(null);
      setPaymentCourse(course);
      return;
    }

    setIsBusy(true);
    try {
      await api.enroll(currentUser.id, course.id);
      await loadUserContext(currentUser);
      await loadCourses();
      addToast(`Solicitud enviada para "${course.title}".`, "info");
      setSelectedCourse(null);

      if (openAfter && currentUser.role !== UserRole.ALUMNO) {
        await openPlayer(course);
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudo completar la inscripcion.";
      addToast(message, "error");
    } finally {
      setIsBusy(false);
    }
  };

  const handleProgressUpdate = async (
    lessonId: string,
    isCompleted: boolean,
    watchedSeconds: number,
  ) => {
    if (!currentUser || !activeCourse) {
      return;
    }

    await api.updateProgress(
      currentUser.id,
      lessonId,
      isCompleted,
      watchedSeconds,
    );
    await loadUserContext(currentUser, true);
    const refreshedCourse = await api.getCourse(activeCourse.id);
    setActiveCourse(refreshedCourse);
    await loadCourses();
  };

  const markNotificationRead = async (notificationId: string) => {
    await api.markNotificationRead(notificationId);
    if (currentUser) {
      const updatedNotifications = await api.getNotifications(currentUser.id);
      setNotifications(updatedNotifications);
    }
  };

  const categories = Array.from(
    new Set(courses.map((course) => course.category)),
  );
  const filteredCourses = applyFilters(courses, filters);
  const enrollmentMap = new Map(
    enrollments.map((enrollment) => [enrollment.courseId, enrollment.status]),
  );
  const progressMap = new Map(
    enrollments.map((enrollment) => [enrollment.courseId, enrollment.progress]),
  );
  const enrolledCourses = courses.filter((course) =>
    isEnrolledStatus(enrollmentMap.get(course.id)),
  );
  const continueLearningCourses = enrolledCourses
    .filter((course) => {
      const progress = progressMap.get(course.id) || 0;
      return progress > 0 && progress < 100;
    })
    .sort(
      (a, b) => (progressMap.get(b.id) || 0) - (progressMap.get(a.id) || 0),
    );
  const completedCourses = enrolledCourses.filter(
    (course) => (progressMap.get(course.id) || 0) >= 100,
  );
  const recommendedCourses = filteredCourses
    .filter((course) => !enrollmentMap.has(course.id))
    .sort((a, b) => b.rating - a.rating);
  const featuredCourse =
    courses.find((course) => course.isFeatured) || courses[0];
  const averageProgress = enrolledCourses.length
    ? Math.round(
        enrolledCourses.reduce(
          (sum, course) => sum + (progressMap.get(course.id) || 0),
          0,
        ) / enrolledCourses.length,
      )
    : 0;

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101010] text-white">
        Cargando campus profesional...
      </div>
    );
  }

  if (!currentUser && currentView === View.LOGIN) {
    return (
      <div className="min-h-screen bg-[#07121D] text-white">
        <div className="mx-auto grid min-h-screen max-w-[1500px] gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="relative hidden overflow-hidden border-r border-white/10 lg:block">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(0,63,111,0.42),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_30%),linear-gradient(135deg,#06111C,#0B1B2A_50%,#07121D)]" />
            <div className="relative flex h-full flex-col gap-16 p-12">
              <BrandLogo className="w-72 max-w-full" />

              <div className="mt-auto max-w-xl space-y-6 pb-12">
                <h1 className="text-5xl font-bold leading-tight">
                  Excelencia en Gestión
                </h1>
                <p className="text-lg leading-8 text-gray-300">
                  Campus profesional para alumnos CIIDEG, con rutas organizadas,
                  seguimiento de progreso y certificados al completar cada
                  programa.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Cursos disponibles</p>
                    <p className="mt-2 text-3xl font-bold">{courses.length}</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Modalidad</p>
                    <p className="mt-2 text-3xl font-bold">Online</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-gray-400">Avance</p>
                    <p className="mt-2 text-3xl font-bold">24/7</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center px-4 py-10 md:px-8">
            <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#0D1B2A] p-8 shadow-2xl shadow-sky-950/30">
              <BrandLogo className="mb-7 w-64 max-w-full" />
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
                Acceso
              </p>
              <h2 className="mt-3 text-3xl font-bold">Inicia sesion</h2>
              <p className="mt-2 text-sm text-gray-400">
                Ingresa con el correo y la contraseña asignados por CIIDEG.
              </p>

              {authError && (
                <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {authError}
                </div>
              )}

              <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                <input
                  type="email"
                  placeholder="Correo electronico"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
                />
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="Contrasena"
                    value={loginForm.password}
                    onChange={(event) =>
                      setLoginForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 pr-12 text-white outline-none placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                    aria-label={showLoginPassword ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="w-full rounded-2xl bg-[#003F6F] px-4 py-3 font-semibold text-white transition hover:bg-[#075B98] disabled:opacity-60"
                >
                  {isBusy ? "Ingresando..." : "Entrar al campus"}
                </button>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="w-full text-sm font-medium text-sky-300 transition hover:text-white"
                >
                  Olvide mi contrasena
                </button>
              </form>

              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="text-sm text-gray-400">Aun no tienes cuenta?</p>
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setRegisterForm({ ...defaultRegisterForm, formStartedAt: Date.now() });
                    setCurrentView(View.REGISTER);
                  }}
                  className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  Crear una cuenta
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!currentUser && currentView === View.REGISTER) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07121D] px-4 py-10 text-white">
        <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0D1B2A] p-8 shadow-2xl shadow-sky-950/30">
          <BrandLogo className="mb-7 w-64 max-w-full" />
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Registro de alumno
          </p>
          <h2 className="mt-3 text-3xl font-bold">Crea tu cuenta CIIDEG</h2>
          <p className="mt-2 text-sm text-gray-400">
            Registra tus datos de alumno para acceder al campus.
          </p>

          {authError && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {authError}
            </div>
          )}

          <form
            onSubmit={handleRegisterSubmit}
            className="mt-6 grid gap-4 md:grid-cols-2"
          >
            <input
              placeholder="Nombre completo"
              value={registerForm.fullName}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500 md:col-span-2"
            />
            <input
              type="email"
              placeholder="Correo electronico"
              value={registerForm.email}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500 md:col-span-2"
            />
            <input
              type="tel"
              inputMode="numeric"
              maxLength={9}
              placeholder="Telefono peruano"
              value={registerForm.phone}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  phone: event.target.value.replace(/\D/g, "").slice(0, 9),
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500 md:col-span-2"
            />
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={registerForm.honeypot || ""}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  honeypot: event.target.value,
                }))
              }
              className="hidden"
              aria-hidden="true"
            />
            <input
              type="password"
              placeholder="Contrasena"
              value={registerForm.password}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Confirmar contrasena"
              value={registerForm.confirmPassword}
              onChange={(event) =>
                setRegisterForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />

            <button
              type="submit"
              disabled={isBusy}
              className="rounded-2xl bg-[#003F6F] px-4 py-3 font-semibold text-white transition hover:bg-[#075B98] disabled:opacity-60 md:col-span-2"
            >
              {isBusy ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setAuthError(null);
              setRegisterForm({ ...defaultRegisterForm, formStartedAt: Date.now() });
              setCurrentView(View.LOGIN);
            }}
            className="mt-6 text-sm text-gray-400 transition hover:text-white"
          >
            Ya tengo cuenta
          </button>
        </div>
      </div>
    );
  }

  if (currentUser && currentView === View.CHANGE_PASSWORD) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07121D] px-4 py-10 text-white">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#0D1B2A] p-8 shadow-2xl shadow-sky-950/30">
          <BrandLogo className="mb-7 w-64 max-w-full" />
          <p className="text-sm uppercase tracking-[0.3em] text-sky-300">
            Seguridad
          </p>
          <h2 className="mt-3 text-3xl font-bold">Cambia tu contrasena</h2>
          <p className="mt-2 text-sm text-gray-400">
            Tu cuenta tiene una clave temporal. Actualizala para continuar.
          </p>

          {authError && (
            <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {authError}
            </div>
          )}

          <form onSubmit={handleChangePasswordSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              placeholder="Clave actual o temporal"
              value={passwordChangeForm.currentPassword}
              onChange={(event) =>
                setPasswordChangeForm((current) => ({
                  ...current,
                  currentPassword: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Nueva contrasena"
              value={passwordChangeForm.newPassword}
              onChange={(event) =>
                setPasswordChangeForm((current) => ({
                  ...current,
                  newPassword: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />
            <input
              type="password"
              placeholder="Confirmar nueva contrasena"
              value={passwordChangeForm.confirmPassword}
              onChange={(event) =>
                setPasswordChangeForm((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="w-full rounded-2xl bg-[#003F6F] px-4 py-3 font-semibold text-white transition hover:bg-[#075B98] disabled:opacity-60"
            >
              {isBusy ? "Guardando..." : "Actualizar contrasena"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 text-sm text-gray-400 transition hover:text-white"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    );
  }

  if (currentView === View.ADMIN && currentUser) {
    return (
      <AdminPanel
        currentUser={currentUser}
        onExit={navigateToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  if (
    (currentView === View.GESTOR || currentView === View.DOCENTE) &&
    currentUser
  ) {
    return (
      <DocentePanel
        currentUser={currentUser}
        onBack={navigateToDashboard}
        onLogout={handleLogout}
      />
    );
  }

  if (currentView === View.COURSE_LANDING && landingCourseId) {
    const course = courses.find((c) => c.id === landingCourseId);
    if (course && systemSettings) {
      return (
        <>
          <CourseLandingPage
            course={course}
            currentUser={currentUser}
            enrollmentStatus={enrollmentMap.get(course.id)}
            settings={systemSettings}
            onLogin={() => setCurrentView(View.LOGIN)}
            onRegister={() => setCurrentView(View.REGISTER)}
            onEnroll={handleEnroll}
            onPlay={handlePlayCourse}
            onBack={navigateToDashboard}
          />
          {paymentCourse && (
            <PaymentModal
              course={paymentCourse}
              currentUser={currentUser!}
              settings={systemSettings}
              onClose={() => setPaymentCourse(null)}
              onSuccess={() => {
                setPaymentCourse(null);
                loadUserContext(currentUser!);
                addToast("Comprobante enviado exitosamente", "success");
              }}
            />
          )}
        </>
      );
    }
  }

  if (currentView === View.PLAYER && activeCourse && currentUser) {
    return (
      <Player
        course={activeCourse}
        user={currentUser}
        progressEntries={lessonProgress}
        onBack={navigateToDashboard}
        onProgressUpdate={handleProgressUpdate}
      />
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#07121D] text-white">
      <Navbar
        user={currentUser}
        activeTab={dashboardTab}
        onTabChange={setDashboardTab}
        onSearch={(search) => setFilters((current) => ({ ...current, search }))}
        notifications={notifications}
        onNotificationRead={markNotificationRead}
        onOpenAdmin={openRolePanel}
        onOpenTeacher={openRolePanel}
        onLogout={handleLogout}
      />

      <main className="pb-16">
        {dashboardTab === "inicio" && !filters.search && featuredCourse && (
          <Hero
            course={featuredCourse}
            onPlay={handlePlayCourse}
            onInfo={(course) => setSelectedCourse(course)}
          />
        )}

        <div
          className={`${dashboardTab === "inicio" && !filters.search ? "-mt-16 md:-mt-28" : "pt-28"} relative z-10 space-y-8 px-4 md:px-10`}
        >
          <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-white/10 bg-[#161616] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                Vista general
              </p>
              <h2 className="mt-3 text-2xl font-bold">
                Hola, {currentUser.fullName}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Tienes {enrolledCourses.length} cursos activos en tu campus y{" "}
                {notifications.filter((item) => !item.isRead).length}{" "}
                notificaciones pendientes.
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-gray-400">Inscritos</p>
                  <p className="mt-2 text-3xl font-bold">
                    {enrolledCourses.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-gray-400">En curso</p>
                  <p className="mt-2 text-3xl font-bold">
                    {continueLearningCourses.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-gray-400">Completados</p>
                  <p className="mt-2 text-3xl font-bold">
                    {completedCourses.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm text-gray-400">Promedio</p>
                  <p className="mt-2 text-3xl font-bold">{averageProgress}%</p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#161616] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                Filtros del catalogo
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-sm text-gray-400">Categoria</p>
                  <div className="flex flex-wrap gap-2">
                    {["all", ...categories].map((category) => (
                      <button
                        key={category}
                        type="button"
                        onClick={() =>
                          setFilters((current) => ({ ...current, category }))
                        }
                        className={`rounded-full px-3 py-2 text-sm ${
                          filters.category === category
                            ? "bg-white text-black"
                            : "bg-white/5 text-gray-300"
                        }`}
                      >
                        {category === "all" ? "Todas" : category}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm text-gray-400">Nivel</p>
                  <div className="flex flex-wrap gap-2">
                    {["all", "Principiante", "Intermedio", "Avanzado"].map(
                      (level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() =>
                            setFilters((current) => ({
                              ...current,
                              level: level as FilterState["level"],
                            }))
                          }
                          className={`rounded-full px-3 py-2 text-sm ${
                            filters.level === level
                              ? "bg-white text-black"
                              : "bg-white/5 text-gray-300"
                          }`}
                        >
                          {level === "all" ? "Todos" : level}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm text-gray-400">Orden</p>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        sort: event.target.value as FilterState["sort"],
                      }))
                    }
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                  >
                    <option value="featured">Destacados</option>
                    <option value="rating">Mejor valorados</option>
                    <option value="newest">Mas recientes</option>
                    <option value="price-asc">Precio menor</option>
                    <option value="price-desc">Precio mayor</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          {courses.length === 0 ? (
            <section className="rounded-[28px] border border-white/10 bg-[#161616] p-8">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-300">
                Catalogo
              </p>
              <h2 className="mt-3 text-2xl font-bold">Aun no hay cursos publicados</h2>
              <p className="mt-2 max-w-2xl text-sm text-gray-400">
                Los cursos creados por Docente o Gestor apareceran aqui cuando se publiquen.
              </p>
            </section>
          ) : dashboardTab === "certificados" ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {certificates.length === 0 ? (
                <div className="rounded-[28px] border border-white/10 bg-[#161616] p-8 text-sm text-gray-400">
                  Completa cursos al 100% para emitir certificados dentro del
                  campus.
                </div>
              ) : (
                certificates.map((certificate) => (
                  <article
                    key={certificate.id}
                    className="rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6"
                  >
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                      Certificado
                    </p>
                    <h3 className="mt-4 text-2xl font-bold">
                      {certificate.courseTitle}
                    </h3>
                    <p className="mt-3 text-sm text-gray-300">
                      Emitido el{" "}
                      {new Date(certificate.issuedAt).toLocaleDateString()}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      Codigo: {certificate.code}
                    </p>
                  </article>
                ))
              )}
            </section>
          ) : dashboardTab === "mis-cursos" ? (
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {enrolledCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourse(course)}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[#161616] text-left transition hover:border-sky-500/30"
                >
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="h-48 w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <h3 className="text-xl font-semibold">{course.title}</h3>
                    <p className="text-sm text-gray-400">{course.instructor}</p>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full bg-[#003F6F]"
                        style={{ width: `${progressMap.get(course.id) || 0}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-300">
                      {progressMap.get(course.id) || 0}% completado
                    </p>
                  </div>
                </button>
              ))}
            </section>
          ) : dashboardTab === "explorar" || filters.search ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => setSelectedCourse(course)}
                  className="overflow-hidden rounded-[28px] border border-white/10 bg-[#161616] text-left transition hover:border-sky-500/30"
                >
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="h-44 w-full object-cover"
                  />
                  <div className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-300">
                        {course.category}
                      </span>
                      <span className="text-sm text-green-400">
                        {course.rating}%
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold">{course.title}</h3>
                    <p className="line-clamp-2 text-sm text-gray-400">
                      {course.description}
                    </p>
                  </div>
                </button>
              ))}
            </section>
          ) : (
            <>
              <CourseRow
                title="Continua aprendiendo"
                courses={continueLearningCourses}
                userEnrollments={enrollmentMap}
                progressMap={progressMap}
                onSelectCourse={setSelectedCourse}
              />
              <CourseRow
                title="Mis cursos"
                courses={enrolledCourses}
                userEnrollments={enrollmentMap}
                progressMap={progressMap}
                onSelectCourse={setSelectedCourse}
              />
              <CourseRow
                title="Recomendados"
                courses={recommendedCourses.slice(0, 8)}
                userEnrollments={enrollmentMap}
                progressMap={progressMap}
                onSelectCourse={setSelectedCourse}
              />
              {categories.map((category) => (
                <CourseRow
                  key={category}
                  title={category}
                  courses={filteredCourses
                    .filter((course) => course.category === category)
                    .slice(0, 8)}
                  userEnrollments={enrollmentMap}
                  progressMap={progressMap}
                  onSelectCourse={setSelectedCourse}
                />
              ))}
            </>
          )}
        </div>
      </main>

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          enrollmentStatus={
            currentUser.role === UserRole.ALUMNO
              ? enrollmentMap.get(selectedCourse.id) || EnrollmentStatus.LOCKED
              : EnrollmentStatus.ACTIVE
          }
          progress={progressMap.get(selectedCourse.id) || 0}
          settings={systemSettings}
          onClose={() => setSelectedCourse(null)}
          onPlay={handlePlayCourse}
          onRequestAccess={(course) =>
            handleEnroll(course, currentUser.role !== UserRole.ALUMNO)
          }
        />
      )}

      {paymentCourse && systemSettings && currentUser && (
        <PaymentModal
          course={paymentCourse}
          currentUser={currentUser}
          settings={systemSettings}
          onClose={() => setPaymentCourse(null)}
          onSuccess={() => {
            setPaymentCourse(null);
            loadUserContext(currentUser);
            addToast("Comprobante enviado exitosamente", "success");
          }}
        />
      )}
    </div>
  );
};

export default App;
