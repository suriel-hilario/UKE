-- CreateEnum
CREATE TYPE "TemporadaEstado" AS ENUM ('abierta', 'cerrada');

-- CreateEnum
CREATE TYPE "BloqueTipo" AS ENUM ('pretemporada', 'temporada', 'unico');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('eskola', 'f7', 'f11');

-- CreateEnum
CREATE TYPE "UsuarioRol" AS ENUM ('admin', 'director', 'coordinador', 'entrenador');

-- CreateEnum
CREATE TYPE "Idioma" AS ENUM ('eu', 'es');

-- CreateEnum
CREATE TYPE "MiembroGrupo" AS ENUM ('con_ficha', 'sin_ficha', 'entrenador');

-- CreateEnum
CREATE TYPE "SesionTipo" AS ENUM ('entrenamiento', 'partido');

-- CreateEnum
CREATE TYPE "SesionOrigen" AS ENUM ('regla', 'manual');

-- CreateEnum
CREATE TYPE "Campo" AS ENUM ('local', 'visitante');

-- CreateEnum
CREATE TYPE "BajaTipo" AS ENUM ('LES', 'SAN', 'ENF', 'VAC', 'NJ');

-- CreateEnum
CREATE TYPE "NotificacionTipo" AS ENUM ('asistencia_dia', 'minutaje_dia', 'recordatorio_semanal');

-- CreateTable
CREATE TABLE "temporada" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" "TemporadaEstado" NOT NULL,

    CONSTRAINT "temporada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloque" (
    "id" UUID NOT NULL,
    "temporada_id" UUID NOT NULL,
    "tipo" "BloqueTipo" NOT NULL,
    "fecha_activacion" DATE NOT NULL,

    CONSTRAINT "bloque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipo" (
    "id" UUID NOT NULL,
    "temporada_id" UUID NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "nombre" TEXT NOT NULL,
    "color" TEXT,
    "icono" TEXT,
    "minutos_por_periodo" INTEGER NOT NULL,
    "num_periodos" INTEGER NOT NULL,
    "dias_entrenamiento" INTEGER[],

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festivo" (
    "id" UUID NOT NULL,
    "temporada_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "festivo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" UUID NOT NULL,
    "auth0_id" TEXT NOT NULL,
    "nombre_visible" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "UsuarioRol" NOT NULL,
    "categoria_asignada" "Categoria",
    "idioma" "Idioma" NOT NULL DEFAULT 'eu',

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persona" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "nombre" TEXT NOT NULL,
    "alias" TEXT,
    "foto_url" TEXT,

    CONSTRAINT "persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "miembro_equipo" (
    "id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "persona_id" UUID NOT NULL,
    "grupo" "MiembroGrupo" NOT NULL,
    "rol_entrenador" TEXT,
    "fecha_incorporacion" DATE NOT NULL,
    "fecha_baja" DATE,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "miembro_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_equipo" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,

    CONSTRAINT "usuario_equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesion" (
    "id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "bloque_id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "numero" INTEGER,
    "tipo" "SesionTipo" NOT NULL,
    "origen" "SesionOrigen" NOT NULL,
    "eliminada" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registro_asistencia" (
    "id" UUID NOT NULL,
    "sesion_id" UUID NOT NULL,
    "miembro_equipo_id" UUID NOT NULL,
    "estado" TEXT NOT NULL,
    "nota" TEXT,

    CONSTRAINT "registro_asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornada" (
    "id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "bloque_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "rival" TEXT,
    "fecha" DATE,
    "campo" "Campo" NOT NULL,
    "goles_favor" INTEGER NOT NULL DEFAULT 0,
    "goles_contra" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacion_jornada" (
    "id" UUID NOT NULL,
    "jornada_id" UUID NOT NULL,
    "miembro_equipo_id" UUID NOT NULL,
    "convocado" BOOLEAN NOT NULL,
    "jugado" BOOLEAN NOT NULL,
    "titular" BOOLEAN NOT NULL,
    "baja" "BajaTipo",
    "minutos" INTEGER NOT NULL DEFAULT 0,
    "goles" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "participacion_jornada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacion_enviada" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "tipo" "NotificacionTipo" NOT NULL,
    "fecha_envio" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "notificacion_enviada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "temporada_nombre_key" ON "temporada"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "bloque_temporada_id_tipo_key" ON "bloque"("temporada_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "festivo_temporada_id_fecha_key" ON "festivo"("temporada_id", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_auth0_id_key" ON "usuario"("auth0_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "persona_usuario_id_key" ON "persona"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "miembro_equipo_equipo_id_persona_id_key" ON "miembro_equipo"("equipo_id", "persona_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_equipo_usuario_id_equipo_id_key" ON "usuario_equipo"("usuario_id", "equipo_id");

-- CreateIndex
CREATE UNIQUE INDEX "sesion_equipo_id_fecha_tipo_key" ON "sesion"("equipo_id", "fecha", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "registro_asistencia_sesion_id_miembro_equipo_id_key" ON "registro_asistencia"("sesion_id", "miembro_equipo_id");

-- CreateIndex
CREATE UNIQUE INDEX "jornada_equipo_id_bloque_id_numero_key" ON "jornada"("equipo_id", "bloque_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "participacion_jornada_jornada_id_miembro_equipo_id_key" ON "participacion_jornada"("jornada_id", "miembro_equipo_id");

-- AddForeignKey
ALTER TABLE "bloque" ADD CONSTRAINT "bloque_temporada_id_fkey" FOREIGN KEY ("temporada_id") REFERENCES "temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipo" ADD CONSTRAINT "equipo_temporada_id_fkey" FOREIGN KEY ("temporada_id") REFERENCES "temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festivo" ADD CONSTRAINT "festivo_temporada_id_fkey" FOREIGN KEY ("temporada_id") REFERENCES "temporada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "persona" ADD CONSTRAINT "persona_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_equipo" ADD CONSTRAINT "miembro_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "miembro_equipo" ADD CONSTRAINT "miembro_equipo_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_equipo" ADD CONSTRAINT "usuario_equipo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario_equipo" ADD CONSTRAINT "usuario_equipo_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesion" ADD CONSTRAINT "sesion_bloque_id_fkey" FOREIGN KEY ("bloque_id") REFERENCES "bloque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_asistencia" ADD CONSTRAINT "registro_asistencia_sesion_id_fkey" FOREIGN KEY ("sesion_id") REFERENCES "sesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registro_asistencia" ADD CONSTRAINT "registro_asistencia_miembro_equipo_id_fkey" FOREIGN KEY ("miembro_equipo_id") REFERENCES "miembro_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jornada" ADD CONSTRAINT "jornada_bloque_id_fkey" FOREIGN KEY ("bloque_id") REFERENCES "bloque"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_jornada" ADD CONSTRAINT "participacion_jornada_jornada_id_fkey" FOREIGN KEY ("jornada_id") REFERENCES "jornada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacion_jornada" ADD CONSTRAINT "participacion_jornada_miembro_equipo_id_fkey" FOREIGN KEY ("miembro_equipo_id") REFERENCES "miembro_equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion_enviada" ADD CONSTRAINT "notificacion_enviada_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacion_enviada" ADD CONSTRAINT "notificacion_enviada_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
