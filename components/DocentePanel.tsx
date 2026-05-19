import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Video, FileText, Link as LinkIcon, Save, X, Youtube, Folder, BookOpen, LogOut, KeyRound, Code } from 'lucide-react';
import GestorPanel from './GestorPanel';
import { Course, User, Material, MaterialType, Module, Lesson, UserRole, SupportRequest, Enrollment, EnrollmentStatus } from '../types';
import { api } from '../services/api';
import { looksLikeRemoteHtml, sanitizeHtml } from '../utils/htmlSanitizer';

interface DocentePanelProps {
  currentUser: User;
  onBack: () => void;
  onLogout: () => void;
}

interface CourseWithModules extends Course {
  modules: (Module & { editing?: boolean })[];
}

const DocentePanel: React.FC<DocentePanelProps> = ({ currentUser, onBack, onLogout }) => {
  const isGestor = currentUser.role === UserRole.GESTOR;
  const [activeTab, setActiveTab] = useState<'courses' | 'profile' | 'payments' | 'users' | 'support' | 'access'>('courses');
  const [courses, setCourses] = useState<CourseWithModules[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [supportRequests, setSupportRequests] = useState<SupportRequest[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseWithModules | null>(null);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    bio: '',
    specialization: '',
    experience: '',
    linkedin: '',
    twitter: '',
    website: ''
  });

  // Course form state
  const [courseForm, setCourseForm] = useState({
    title: '',
    description: '',
    coverImage: '',
    posterImage: '',
    price: 0,
    duration: '',
    level: 'Principiante' as const,
    category: '',
    instructor: currentUser.fullName,
    isFeatured: false
  });

  // Module editing state
  const [editingModule, setEditingModule] = useState<{ courseId: string; moduleIndex: number } | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: '', lessons: [{ title: '', duration: '', youtubeId: '' }] });

  // Material editing state
  const [editingLessonMaterials, setEditingLessonMaterials] = useState<{ 
    courseId: string; 
    moduleIndex: number; 
    lessonIndex: number;
    lesson: Lesson 
  } | null>(null);
  const [materialForm, setMaterialForm] = useState({ title: '', url: '', type: MaterialType.DRIVE });

  useEffect(() => {
    loadCourses();
    loadProfile();
  }, [currentUser]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const allCourses = await api.getCourses();
      const instructorCourses = allCourses.filter(
        (course) =>
          course.instructorId === currentUser.id ||
          (!course.instructorId && course.instructor === currentUser.fullName),
      );
      setCourses(instructorCourses);
      if (isGestor) {
        const [usersData, supportData, enrollmentData] = await Promise.all([
          api.getUsers(),
          api.getSupportRequests(),
          api.getAllEnrollments(),
        ]);
        setAllUsers(usersData);
        setSupportRequests(supportData);
        setEnrollments(enrollmentData);
      }
    } catch (error) {
      void error;
    } finally {
      setLoading(false);
    }
  };

  const refreshGestorData = async () => {
    const [usersData, supportData, enrollmentData] = await Promise.all([
      api.getUsers(),
      api.getSupportRequests(),
      api.getAllEnrollments(),
    ]);
    setAllUsers(usersData);
    setSupportRequests(supportData);
    setEnrollments(enrollmentData);
  };

  const resetStudent = async (userId: string) => {
    setLoading(true);
    try {
      const temporaryPassword = await api.resetStudentPassword(userId);
      await refreshGestorData();
      alert(`Clave temporal generada: ${temporaryPassword}`);
    } finally {
      setLoading(false);
    }
  };

  const resetSupport = async (requestId: string) => {
    setLoading(true);
    try {
      const temporaryPassword = await api.resetSupportRequestPassword(requestId, currentUser.id);
      await refreshGestorData();
      alert(`Clave temporal generada: ${temporaryPassword}`);
    } finally {
      setLoading(false);
    }
  };

  const approveEnrollment = async (enrollmentId?: string) => {
    if (!enrollmentId) return;
    setLoading(true);
    try {
      await api.updateEnrollmentStatus(enrollmentId, EnrollmentStatus.ACTIVE);
      await refreshGestorData();
    } finally {
      setLoading(false);
    }
  };

  const loadProfile = async () => {
    try {
      const profileData = await api.getTeacherProfile(currentUser.id);
      if (profileData) {
        setProfile({
          bio: profileData.bio || '',
          specialization: profileData.specialization || '',
          experience: profileData.experience || '',
          linkedin: profileData.socialLinks?.linkedin || '',
          twitter: profileData.socialLinks?.twitter || '',
          website: profileData.socialLinks?.website || ''
        });
      }
    } catch (error) {
      // El perfil se creara al guardar cambios.
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.createCourse({
        ...courseForm,
        instructor: currentUser.fullName,
        instructorId: currentUser.id,
      });
      
      await loadCourses();
      setShowCourseForm(false);
      resetCourseForm();
      alert('Curso creado exitosamente');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear el curso';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    
    try {
      setLoading(true);
      await api.updateCourse(editingCourse.id, {
        ...courseForm,
        instructor: currentUser.fullName,
        instructorId: currentUser.id,
      });
      
      await loadCourses();
      setEditingCourse(null);
      setShowCourseForm(false);
      resetCourseForm();
      alert('Curso actualizado exitosamente');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar el curso';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('¿Estás seguro de eliminar este curso?')) return;
    
    try {
      setLoading(true);
      await api.deleteCourse(courseId);
      await loadCourses();
      alert('Curso eliminado exitosamente');
    } catch (error) {
      void error;
      alert('Error al eliminar el curso');
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course: CourseWithModules) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description,
      coverImage: course.coverImage,
      posterImage: course.posterImage,
      price: course.price,
      duration: course.duration,
      level: course.level,
      category: course.category,
      instructor: course.instructor,
      isFeatured: course.isFeatured || false
    });
    setShowCourseForm(true);
  };

  const resetCourseForm = () => {
    setCourseForm({
      title: '',
      description: '',
      coverImage: '',
      posterImage: '',
      price: 0,
      duration: '',
      level: 'Principiante',
      category: '',
      instructor: currentUser.fullName,
      isFeatured: false
    });
  };

  const handleCourseImageUpload = (field: 'coverImage' | 'posterImage', file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCourseForm((current) => ({ ...current, [field]: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

  const shareCourse = async (course: Course) => {
    const link = api.getCoursePublicLink(course.id, course.title);
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(link);
      alert('Enlace copiado al portapapeles');
      return;
    }
    window.prompt('Enlace del curso', link);
  };

  const handleAddModule = async (courseId: string) => {
    setEditingModule({ courseId, moduleIndex: -1 });
    setModuleForm({ title: '', lessons: [{ title: '', duration: '', youtubeId: '' }] });
  };

  const handleSaveModule = async () => {
    if (!editingModule || !moduleForm.title) return;
    
    try {
      setLoading(true);
      const course = courses.find(c => c.id === editingModule.courseId);
      if (!course) return;

      const newModule: Module = {
        id: Date.now().toString(),
        title: moduleForm.title,
        lessons: moduleForm.lessons.map((l, idx) => ({
          id: `lesson-${Date.now()}-${idx}`,
          title: l.title,
          duration: l.duration,
          youtubeId: l.youtubeId,
          isCompleted: false,
          materials: []
        }))
      };

      const updatedModules = [...course.modules, newModule];
      await api.updateCourseModules(course.id, updatedModules);
      await loadCourses();
      setEditingModule(null);
      alert('Módulo agregado exitosamente');
    } catch (error) {
      void error;
      alert('Error al agregar módulo');
    } finally {
      setLoading(false);
    }
  };

  const handleAddLesson = (moduleIndex: number) => {
    setModuleForm({
      ...moduleForm,
      lessons: [...moduleForm.lessons, { title: '', duration: '', youtubeId: '' }]
    });
  };

  const handleUpdateLesson = (lessonIndex: number, field: keyof typeof moduleForm.lessons[0], value: string) => {
    const newLessons = [...moduleForm.lessons];
    newLessons[lessonIndex] = { ...newLessons[lessonIndex], [field]: value };
    setModuleForm({ ...moduleForm, lessons: newLessons });
  };

  const handleRemoveLesson = (lessonIndex: number) => {
    setModuleForm({
      ...moduleForm,
      lessons: moduleForm.lessons.filter((_, idx) => idx !== lessonIndex)
    });
  };

  const handleOpenMaterials = (course: CourseWithModules, moduleIndex: number, lessonIndex: number, lesson: Lesson) => {
    setEditingLessonMaterials({ courseId: course.id, moduleIndex, lessonIndex, lesson });
    setMaterialForm({ title: '', url: '', type: MaterialType.DRIVE });
  };

  const handleAddMaterial = async () => {
    if (!editingLessonMaterials || !materialForm.title.trim() || !materialForm.url.trim()) return;

    try {
      setLoading(true);
      const course = courses.find(c => c.id === editingLessonMaterials.courseId);
      if (!course) return;

      const materialUrl =
        materialForm.type === MaterialType.HTML && !looksLikeRemoteHtml(materialForm.url)
          ? sanitizeHtml(materialForm.url)
          : materialForm.url.trim();

      const newMaterial: Material = {
        id: `material-${Date.now()}`,
        title: materialForm.title.trim(),
        type: materialForm.type,
        url: materialUrl
      };

      const updatedModules = course.modules.map((mod, mIdx) => {
        if (mIdx !== editingLessonMaterials.moduleIndex) return mod;
        
        return {
          ...mod,
          lessons: mod.lessons.map((lesson, lIdx) => {
            if (lIdx !== editingLessonMaterials.lessonIndex) return lesson;
            return { ...lesson, materials: [...(lesson.materials || []), newMaterial] };
          })
        };
      });

      await api.updateCourseModules(course.id, updatedModules);
      await loadCourses();
      setMaterialForm({ title: '', url: '', type: MaterialType.DRIVE });
      
      // Update the editing lesson with new materials
      const updatedLesson = updatedModules[editingLessonMaterials.moduleIndex]
        .lessons[editingLessonMaterials.lessonIndex];
      setEditingLessonMaterials({ 
        ...editingLessonMaterials, 
        lesson: updatedLesson 
      });
      
      alert('Material agregado exitosamente');
    } catch (error) {
      void error;
      alert('Error al agregar material');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMaterial = async (materialId: string) => {
    if (!editingLessonMaterials) return;

    try {
      setLoading(true);
      const course = courses.find(c => c.id === editingLessonMaterials.courseId);
      if (!course) return;

      const updatedModules = course.modules.map((mod, mIdx) => {
        if (mIdx !== editingLessonMaterials.moduleIndex) return mod;
        
        return {
          ...mod,
          lessons: mod.lessons.map((lesson, lIdx) => {
            if (lIdx !== editingLessonMaterials.lessonIndex) return lesson;
            return { 
              ...lesson, 
              materials: lesson.materials?.filter(m => m.id !== materialId) || [] 
            };
          })
        };
      });

      await api.updateCourseModules(course.id, updatedModules);
      await loadCourses();
      
      const updatedLesson = updatedModules[editingLessonMaterials.moduleIndex]
        .lessons[editingLessonMaterials.lessonIndex];
      setEditingLessonMaterials({ 
        ...editingLessonMaterials, 
        lesson: updatedLesson 
      });
      
      alert('Material eliminado exitosamente');
    } catch (error) {
      void error;
      alert('Error al eliminar material');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updateTeacherProfile(currentUser.id, {
        bio: profile.bio,
        specialization: profile.specialization,
        experience: profile.experience,
        socialLinks: {
          linkedin: profile.linkedin,
          twitter: profile.twitter,
          website: profile.website
        }
      });
      setShowProfileForm(false);
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      void error;
      alert('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialIcon = (type: MaterialType) => {
    switch (type) {
      case MaterialType.YOUTUBE: return <Video size={16} className="text-red-500" />;
      case MaterialType.DRIVE: return <Folder size={16} className="text-blue-500" />;
      case MaterialType.LINK: return <LinkIcon size={16} className="text-sky-400" />;
      case MaterialType.HTML: return <Code size={16} className="text-sky-300" />;
      default: return <FileText size={16} className="text-gray-500" />;
    }
  };

  const getMaterialTypeLabel = (type: MaterialType) => {
    switch (type) {
      case MaterialType.YOUTUBE: return 'YouTube';
      case MaterialType.DRIVE: return 'Google Drive';
      case MaterialType.LINK: return 'Enlace';
      case MaterialType.HTML: return 'HTML';
      default: return 'PDF';
    }
  };

  if (loading && courses.length === 0 && !profile.bio) {
    return <div className="h-screen w-full bg-[#07121D] flex items-center justify-center text-white">Cargando panel...</div>;
  }

  return (
    <div className="min-h-screen bg-[#07121D] text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#003F6F]/50 to-[#07121D] border-b border-gray-800 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-sky-400">
              {isGestor ? 'Panel del Gestor' : 'Panel del Docente'}
            </h1>
            <p className="text-gray-400 mt-1">
              {isGestor ? 'Gestiona cursos, perfil y verifica pagos' : 'Gestiona tus cursos y perfil'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition flex items-center gap-2"
            >
              <X size={18} />
              Volver al Campus
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-900/40 hover:bg-red-900/70 text-red-100 rounded-lg transition flex items-center gap-2"
            >
              <LogOut size={18} />
              Cerrar Sesion
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'courses'
                ? 'bg-[#003F6F] text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Mis Cursos
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'profile'
                ? 'bg-[#003F6F] text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Mi Perfil
          </button>
          {isGestor && (
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-6 py-3 rounded-lg font-medium transition ${
                activeTab === 'payments'
                  ? 'bg-[#003F6F] text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Verificar Pagos
            </button>
          )}
          {isGestor && (
            <>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  activeTab === 'users'
                    ? 'bg-[#003F6F] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Usuarios
              </button>
              <button
                onClick={() => setActiveTab('support')}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  activeTab === 'support'
                    ? 'bg-[#003F6F] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Soporte
              </button>
              <button
                onClick={() => setActiveTab('access')}
                className={`px-6 py-3 rounded-lg font-medium transition ${
                  activeTab === 'access'
                    ? 'bg-[#003F6F] text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                Accesos
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-8">
        {activeTab === 'payments' && isGestor && (
          <GestorPanel currentUser={currentUser} onBack={onBack} isEmbedded />
        )}

        {activeTab === 'users' && isGestor && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6">
            <h2 className="text-2xl font-bold mb-6">Gestion de Usuarios</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-gray-400">
                  <tr>
                    <th className="pb-3">Alumno</th>
                    <th className="pb-3">Telefono</th>
                    <th className="pb-3">Estado clave</th>
                    <th className="pb-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.filter((user) => user.role === UserRole.ALUMNO).map((user) => (
                    <tr key={user.id} className="border-t border-gray-800">
                      <td className="py-4">
                        <p className="font-medium">{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </td>
                      <td className="py-4 text-gray-300">{user.phone || '-'}</td>
                      <td className="py-4">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-gray-200">
                          {user.mustChangePassword ? 'Cambio obligatorio' : 'Activa'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() => resetStudent(user.id)}
                          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
                        >
                          <KeyRound size={14} />
                          Generar clave temporal
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'support' && isGestor && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6">
            <h2 className="text-2xl font-bold mb-6">Solicitudes de Soporte</h2>
            <div className="grid gap-4">
              {supportRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold">{request.userName || request.email}</p>
                    <p className="text-sm text-gray-400">{request.email}</p>
                    <p className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleString('es-PE')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs ${request.status === 'pending' ? 'bg-amber-500/10 text-amber-200' : 'bg-emerald-500/10 text-emerald-200'}`}>
                      {request.status === 'pending' ? 'Pendiente' : 'Atendida'}
                    </span>
                    {request.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => resetSupport(request.id)}
                        className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-black hover:bg-amber-400"
                      >
                        Generar clave temporal
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'access' && isGestor && (
          <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-6">
            <h2 className="text-2xl font-bold mb-6">Accesos pendientes</h2>
            <div className="grid gap-4">
              {enrollments
                .filter((item) => item.status === EnrollmentStatus.PENDING || item.status === EnrollmentStatus.PENDING_PAYMENT)
                .map((enrollment) => {
                  const student = allUsers.find((user) => user.id === enrollment.userId);
                  return (
                    <div key={enrollment.id} className="flex flex-col gap-3 rounded-2xl border border-gray-800 bg-black/20 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">{enrollment.course?.title}</p>
                        <p className="text-sm text-gray-400">{student?.fullName} - {student?.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => approveEnrollment(enrollment.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                      >
                        Aprobar acceso
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {activeTab === 'courses' && (
          <div>
            {/* Courses Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Cursos que impartes</h2>
              <button
                onClick={() => {
                  setEditingCourse(null);
                  resetCourseForm();
                  setShowCourseForm(true);
                }}
                className="px-4 py-2 bg-[#003F6F] hover:bg-[#075B98] rounded-lg transition flex items-center gap-2"
              >
                <Plus size={18} />
                Nuevo Curso
              </button>
            </div>

            {/* Course Form Modal */}
            {showCourseForm && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-8 max-w-2xl w-full my-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">
                      {editingCourse ? 'Editar Curso' : 'Crear Nuevo Curso'}
                    </h3>
                    <button onClick={() => { setShowCourseForm(false); setEditingCourse(null); resetCourseForm(); }}>
                      <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  <form onSubmit={editingCourse ? handleUpdateCourse : handleCreateCourse} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-2 uppercase">Título del Curso</label>
                      <input
                        type="text"
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        placeholder="Ej: Introducción a Python"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2 uppercase">Descripción</label>
                      <textarea
                        value={courseForm.description}
                        onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        rows={4}
                        placeholder="Describe el curso..."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase">Imagen Portada (landscape)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCourseImageUpload('coverImage', e.target.files?.[0])}
                          className="mb-2 w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#003F6F] file:px-3 file:py-2 file:text-white"
                        />
                        <input
                          type="text"
                          value={courseForm.coverImage}
                          onChange={(e) => setCourseForm({ ...courseForm, coverImage: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                          placeholder="URL o imagen cargada"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase">Imagen Poster (portrait)</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleCourseImageUpload('posterImage', e.target.files?.[0])}
                          className="mb-2 w-full text-sm text-gray-300 file:mr-3 file:rounded-lg file:border-0 file:bg-[#003F6F] file:px-3 file:py-2 file:text-white"
                        />
                        <input
                          type="text"
                          value={courseForm.posterImage}
                          onChange={(e) => setCourseForm({ ...courseForm, posterImage: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                          placeholder="URL o imagen cargada"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase">Precio ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={courseForm.price}
                          onChange={(e) => setCourseForm({ ...courseForm, price: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase">Duración</label>
                        <input
                          type="text"
                          value={courseForm.duration}
                          onChange={(e) => setCourseForm({ ...courseForm, duration: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                          placeholder="Ej: 20 horas"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase">Nivel</label>
                        <select
                          value={courseForm.level}
                          onChange={(e) => setCourseForm({ ...courseForm, level: e.target.value as any })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        >
                          <option value="Principiante">Principiante</option>
                          <option value="Intermedio">Intermedio</option>
                          <option value="Avanzado">Avanzado</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-gray-400 text-xs mb-2 uppercase">Categoría</label>
                        <input
                          type="text"
                          value={courseForm.category}
                          onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                          placeholder="Ej: Tecnología"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="isFeatured"
                          checked={courseForm.isFeatured}
                          onChange={(e) => setCourseForm({ ...courseForm, isFeatured: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="isFeatured" className="text-gray-400">Curso destacado</label>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#003F6F] hover:bg-[#075B98] text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        {loading ? 'Guardando...' : (editingCourse ? 'Actualizar Curso' : 'Crear Curso')}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCourseForm(false); setEditingCourse(null); resetCourseForm(); }}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Module Form Modal */}
            {editingModule && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-8 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Agregar Módulo</h3>
                    <button onClick={() => setEditingModule(null)}>
                      <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-2 uppercase">Título del Módulo</label>
                      <input
                        type="text"
                        value={moduleForm.title}
                        onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        placeholder="Ej: Fundamentos de Python"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-gray-400 text-xs uppercase">Videos (YouTube)</label>
                        <button
                          type="button"
                          onClick={() => handleAddLesson(moduleForm.lessons.length)}
                          className="text-sky-400 hover:text-sky-300 text-sm flex items-center gap-1"
                        >
                          <Plus size={14} /> Agregar Video
                        </button>
                      </div>

                      <div className="space-y-3">
                        {moduleForm.lessons.map((lesson, idx) => (
                          <div key={idx} className="bg-[#2a2a2a] rounded-lg p-4 border border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-gray-400 text-sm">Video {idx + 1}</span>
                              {moduleForm.lessons.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveLesson(idx)}
                                  className="text-red-500 hover:text-red-400"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Título del video"
                                value={lesson.title}
                                onChange={(e) => handleUpdateLesson(idx, 'title', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                              />
                              <input
                                type="text"
                                placeholder="Duración (Ej: 10:00)"
                                value={lesson.duration}
                                onChange={(e) => handleUpdateLesson(idx, 'duration', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                              />
                              <input
                                type="text"
                                placeholder="YouTube Video ID (Ej: _uQrJ0TkZlc)"
                                value={lesson.youtubeId}
                                onChange={(e) => handleUpdateLesson(idx, 'youtubeId', e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={handleSaveModule}
                        className="flex-1 bg-[#003F6F] hover:bg-[#075B98] text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        Guardar Módulo
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingModule(null)}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Materials Modal */}
            {editingLessonMaterials && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-8 max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold">Materiales de la Clase</h3>
                      <p className="text-gray-400 text-sm">{editingLessonMaterials.lesson.title}</p>
                    </div>
                    <button onClick={() => setEditingLessonMaterials(null)}>
                      <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  {/* Existing Materials */}
                  <div className="mb-6">
                    <h4 className="text-gray-400 text-sm uppercase mb-3">Materiales Existentes</h4>
                    {editingLessonMaterials.lesson.materials && editingLessonMaterials.lesson.materials.length > 0 ? (
                      <div className="space-y-2">
                        {editingLessonMaterials.lesson.materials.map((material) => (
                          <div key={material.id} className="flex items-center justify-between bg-[#2a2a2a] rounded-lg p-3 border border-gray-700">
                            <div className="flex items-center gap-3">
                              {getMaterialIcon(material.type)}
                              <div>
                                <p className="text-white font-medium">{material.title}</p>
                                <p className="text-gray-500 text-xs">{getMaterialTypeLabel(material.type)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {material.type !== MaterialType.HTML && (
                                <a
                                  href={material.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sky-400 hover:text-sky-300 text-sm"
                                >
                                  Abrir
                                </a>
                              )}
                              <button
                                onClick={() => handleRemoveMaterial(material.id)}
                                className="text-red-500 hover:text-red-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No hay materiales agregados</p>
                    )}
                  </div>

                  {/* Add Material Form */}
                  <div className="border-t border-gray-700 pt-4">
                    <h4 className="text-gray-400 text-sm uppercase mb-3">Agregar Nuevo Material</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-gray-400 text-xs mb-2">Título</label>
                        <input
                          type="text"
                          value={materialForm.title}
                          onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                          placeholder="Ej: Guía de estudio"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-2">Tipo</label>
                        <select
                          value={materialForm.type}
                          onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value as MaterialType })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                        >
                          <option value={MaterialType.DRIVE}>Google Drive</option>
                          <option value={MaterialType.LINK}>Enlace Externo</option>
                          <option value={MaterialType.PDF}>PDF</option>
                          <option value={MaterialType.HTML}>HTML (Código o URL)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-xs mb-2">
                          {materialForm.type === MaterialType.HTML ? 'Código HTML o URL del HTML' :
                           `URL ${materialForm.type === MaterialType.DRIVE ? '(Google Drive)' : ''}`}
                        </label>
                        {materialForm.type === MaterialType.HTML ? (
                          <textarea
                            value={materialForm.url}
                            onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500 min-h-[100px]"
                            placeholder="Ej: <h1>Hola Mundo</h1> o https://ejemplo.com/page.html"
                          />
                        ) : (
                          <input
                            type="url"
                            value={materialForm.url}
                            onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                            className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                            placeholder={
                              materialForm.type === MaterialType.DRIVE
                                ? 'https://drive.google.com/...'
                                : 'https://...'
                            }
                          />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleAddMaterial}
                        disabled={loading || !materialForm.title || !materialForm.url}
                        className="w-full bg-[#003F6F] hover:bg-[#075B98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 rounded-lg transition flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        Agregar Material
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-gray-700 mt-4">
                    <button
                      type="button"
                      onClick={() => setEditingLessonMaterials(null)}
                      className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Courses Grid */}
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen size={64} className="mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400 text-lg">No tienes cursos creados aún</p>
                <p className="text-gray-500 text-sm mt-2">Haz clic en "Nuevo Curso" para comenzar</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="bg-[#1a1a1a] rounded-xl overflow-hidden border border-gray-800 hover:border-sky-500/50 transition group">
                    <div className="relative">
                      <img
                        src={course.coverImage}
                        alt={course.title}
                        className="w-full h-40 object-cover"
                      />
                      {course.isFeatured && (
                        <span className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                          DESTACADO
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2 line-clamp-1">{course.title}</h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">{course.description}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <span className="bg-gray-800 px-2 py-1 rounded">{course.level}</span>
                        <span>{course.duration}</span>
                      </div>

                      {/* Modules Section */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs uppercase">Módulos</span>
                          <button
                            onClick={() => handleAddModule(course.id)}
                            className="text-sky-400 hover:text-sky-300 text-xs flex items-center gap-1"
                          >
                            <Plus size={12} /> Agregar
                          </button>
                        </div>
                        {course.modules.length > 0 ? (
                          <div className="space-y-1">
                            {course.modules.map((module, mIdx) => (
                              <div key={module.id} className="bg-[#2a2a2a] rounded px-3 py-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-gray-300">{module.title}</span>
                                  <span className="text-xs text-gray-500">{module.lessons.length} videos</span>
                                </div>
                                {module.lessons.map((lesson, lIdx) => (
                                  <div key={lesson.id} className="mt-2 pt-2 border-t border-gray-700">
                                    <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-2">
                                        <Youtube size={14} className="text-red-500" />
                                        <span className="text-xs text-gray-400">{lesson.title}</span>
                                      </div>
                                      <span className="text-xs text-gray-500">{lesson.duration}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleOpenMaterials(course, mIdx, lIdx, lesson)}
                                        className="text-sky-400 hover:text-sky-300 text-xs flex items-center gap-1"
                                      >
                                        <Folder size={12} />
                                        {(lesson.materials?.length || 0)} materiales
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-xs">Sin módulos</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditCourse(course)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm"
                        >
                          <Edit size={14} />
                          Editar
                        </button>
                        <button
                          onClick={() => shareCourse(course)}
                          className="flex-1 bg-[#003F6F] hover:bg-[#075B98] text-white py-2 rounded-lg transition flex items-center justify-center gap-2 text-sm"
                        >
                          <LinkIcon size={14} />
                          Compartir
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="px-3 bg-red-900/50 hover:bg-red-900 text-red-400 py-2 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Perfil del Docente</h2>
              {!showProfileForm && (
                <button
                  onClick={() => setShowProfileForm(true)}
                  className="px-4 py-2 bg-[#003F6F] hover:bg-[#075B98] rounded-lg transition flex items-center gap-2"
                >
                  <Edit size={18} />
                  Editar Perfil
                </button>
              )}
            </div>

            {/* Profile Form Modal */}
            {showProfileForm && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-[#1a1a1a] border border-gray-700 rounded-2xl p-8 max-w-2xl w-full my-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold">Editar Perfil</h3>
                    <button onClick={() => setShowProfileForm(false)}>
                      <X size={24} className="text-gray-400 hover:text-white" />
                    </button>
                  </div>

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div>
                      <label className="block text-gray-400 text-xs mb-2 uppercase">Especialización</label>
                      <input
                        type="text"
                        value={profile.specialization}
                        onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        placeholder="Ej: Desarrollo Web, Data Science"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2 uppercase">Experiencia</label>
                      <input
                        type="text"
                        value={profile.experience}
                        onChange={(e) => setProfile({ ...profile, experience: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        placeholder="Ej: 10 años en la industria"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 text-xs mb-2 uppercase">Biografía</label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500"
                        rows={5}
                        placeholder="Cuéntanos sobre ti, tu experiencia y pasión por la enseñanza..."
                      />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-gray-400 text-sm uppercase">Redes Sociales (Opcional)</h4>
                      
                      <div>
                        <label className="block text-gray-400 text-xs mb-2">LinkedIn</label>
                        <input
                          type="url"
                          value={profile.linkedin}
                          onChange={(e) => setProfile({ ...profile, linkedin: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                          placeholder="https://linkedin.com/in/tu-perfil"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs mb-2">Twitter / X</label>
                        <input
                          type="url"
                          value={profile.twitter}
                          onChange={(e) => setProfile({ ...profile, twitter: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                          placeholder="https://twitter.com/tu-usuario"
                        />
                      </div>

                      <div>
                        <label className="block text-gray-400 text-xs mb-2">Sitio Web</label>
                        <input
                          type="url"
                          value={profile.website}
                          onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                          className="w-full bg-[#2a2a2a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500"
                          placeholder="https://tu-sitio-web.com"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-[#003F6F] hover:bg-[#075B98] text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowProfileForm(false)}
                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Profile Display */}
            <div className="bg-[#1a1a1a] rounded-2xl border border-gray-800 p-8">
              <div className="flex items-start gap-6 mb-8">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.fullName}
                  className="w-24 h-24 rounded-full border-2 border-sky-500"
                />
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-white mb-2">{currentUser.fullName}</h3>
                  <p className="text-gray-400 mb-4">{currentUser.email}</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.specialization && (
                      <span className="bg-sky-500/10 text-sky-300 px-3 py-1 rounded-full text-sm">
                        {profile.specialization}
                      </span>
                    )}
                    {profile.experience && (
                      <span className="bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full text-sm">
                        {profile.experience}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {profile.bio && (
                <div className="mb-6">
                  <h4 className="text-gray-400 text-sm uppercase mb-2">Sobre mí</h4>
                  <p className="text-gray-300 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {(profile.linkedin || profile.twitter || profile.website) && (
                <div>
                  <h4 className="text-gray-400 text-sm uppercase mb-3">Enlaces</h4>
                  <div className="flex gap-4">
                    {profile.linkedin && (
                      <a
                        href={profile.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                        </svg>
                        LinkedIn
                      </a>
                    )}
                    {profile.twitter && (
                      <a
                        href={profile.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 flex items-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Twitter
                      </a>
                    )}
                    {profile.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-300 hover:text-sky-200 flex items-center gap-2"
                      >
                        <LinkIcon size={20} />
                        Sitio Web
                      </a>
                    )}
                  </div>
                </div>
              )}

              {(!profile.bio && !profile.specialization && !profile.experience) && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Tu perfil está vacío. Haz clic en "Editar Perfil" para agregar información.</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-sky-500/10 rounded-full text-sky-300">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Cursos Creados</p>
                    <p className="text-2xl font-bold">{courses.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-900/30 rounded-full text-blue-400">
                    <Video size={24} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Videos Totales</p>
                    <p className="text-2xl font-bold">
                      {courses.reduce((acc, c) => acc + c.modules.reduce((a, m) => a + m.lessons.length, 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-900/30 rounded-full text-purple-400">
                    <Folder size={24} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Materiales</p>
                    <p className="text-2xl font-bold">
                      {courses.reduce((acc, c) => acc + c.modules.reduce((a, m) => a + m.lessons.reduce((l, les) => l + (les.materials?.length || 0), 0), 0), 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocentePanel;
