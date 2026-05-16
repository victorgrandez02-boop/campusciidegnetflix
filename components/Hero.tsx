import React, { useState } from 'react';
import { Play, Info, Star, Clock, Award, TrendingUp } from 'lucide-react';
import { Course, CourseLevel } from '../types';

interface HeroProps {
  course: Course;
  onPlay: (courseId: string) => void;
  onInfo: (course: Course) => void;
}

const Hero: React.FC<HeroProps> = ({ course, onPlay, onInfo }) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Función para obtener el color del nivel
  const getLevelColor = (level: CourseLevel) => {
    switch (level) {
      case 'Principiante': return 'bg-green-600';
      case 'Intermedio': return 'bg-yellow-600';
      case 'Avanzado': return 'bg-[#003F6F]';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="relative h-[75vh] md:h-[85vh] w-full overflow-hidden">
      {/* Background Image con lazy loading */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-700"
        style={{ 
          backgroundImage: `url(${course.coverImage})`,
          opacity: imageLoaded ? 1 : 0.5
        }}
        onLoad={() => setImageLoaded(true)}
      >
        {/* Múltiples capas de overlay para mejor legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#07121D] via-transparent to-black/40"></div>
        <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-transparent"></div>
        
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }}></div>
      </div>

      {/* Contenido */}
      <div className="relative h-full">
        <div className="absolute bottom-[8%] md:bottom-[10%] left-0 right-0 px-4 md:px-12">
          <div className="max-w-2xl space-y-4 md:space-y-5">
            
            {/* Badge de destacado si aplica */}
            {course.isFeatured && (
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#003F6F] to-[#075B98] text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-sky-950/30 mb-4">
                <Star size={12} fill="white" />
                CURSO DESTACADO
              </div>
            )}

            {/* Título con animación */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-2xl leading-tight animate-fade-in">
              {course.title}
            </h1>

            {/* Metadata del curso */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm md:text-base">
              {/* Rating */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <Star size={16} className="text-yellow-400" fill="currentColor" />
                <span className="text-green-400 font-bold">{course.rating}%</span>
                <span className="text-gray-300">de coincidencia</span>
              </div>

              {/* Duración */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <Clock size={16} className="text-gray-300" />
                <span className="text-gray-300">{course.duration}</span>
              </div>

              {/* Nivel */}
              <div className={`flex items-center gap-2 ${getLevelColor(course.level)} px-3 py-1.5 rounded-lg`}>
                <Award size={16} className="text-white" />
                <span className="text-white text-xs font-bold uppercase">{course.level}</span>
              </div>

              {/* Categoría */}
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <TrendingUp size={16} className="text-blue-400" />
                <span className="text-gray-300">{course.category}</span>
              </div>
            </div>

            {/* Descripción */}
            <p className="text-white text-base md:text-xl drop-shadow-lg line-clamp-3 md:line-clamp-none leading-relaxed text-shadow">
              {course.description}
            </p>

            {/* Instructor */}
            <div className="flex items-center gap-3 text-sm md:text-base text-gray-300">
              <span className="text-gray-400">Instructor:</span>
              <span className="text-white font-medium">{course.instructor}</span>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-6 md:mt-8">
              {/* Botón Reproducir */}
              <button
                onClick={() => onPlay(course.id)}
                className="group bg-white text-black px-6 md:px-10 py-3 md:py-4 rounded-lg flex items-center gap-3 font-bold hover:bg-gray-200 transition-all duration-300 transform hover:scale-105 shadow-xl"
              >
                <Play fill="black" size={28} className="group-hover:scale-110 transition-transform" />
                <span className="text-lg">Reproducir</span>
              </button>

              {/* Botón Más Información */}
              <button
                onClick={() => onInfo(course)}
                className="group bg-gray-500/70 text-white px-6 md:px-10 py-3 md:py-4 rounded-lg flex items-center gap-3 font-bold hover:bg-gray-500/50 transition-all duration-300 backdrop-blur-sm shadow-xl"
              >
                <Info size={28} className="group-hover:scale-110 transition-transform" />
                <span className="text-lg">Más Información</span>
              </button>
            </div>

            {/* Información adicional */}
            <div className="flex flex-wrap items-center gap-4 pt-4 text-xs md:text-sm text-gray-400">
              {course.price > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold text-lg">${course.price}</span>
                  <span>precio único</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-400">
                  <Star size={16} fill="currentColor" />
                  <span className="font-bold">GRATIS</span>
                </div>
              )}
              
              <span>•</span>
              
              {course.modules && course.modules.length > 0 ? (
                <span>{course.modules.length} módulos</span>
              ) : (
                <span>Próximamente más contenido</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gradiente inferior para transición suave */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#07121D] to-transparent"></div>
    </div>
  );
};

export default Hero;
