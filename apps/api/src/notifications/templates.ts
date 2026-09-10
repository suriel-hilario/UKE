import { usuario } from '../generated/prisma/client'

export interface EmailContent {
  subject: string
  text: string
  html: string
}

function isEuskera(usuarioIdioma: usuario['idioma']): boolean {
  return usuarioIdioma === 'eu'
}

export function buildAsistenciaDiaTemplate(
  destinatario: Pick<usuario, 'idioma' | 'nombre_visible'>,
  equipoNombre: string,
  fecha: string,
  link: string,
): EmailContent {
  if (isEuskera(destinatario.idioma)) {
    return {
      subject: `Mesedez, erregistratu gaurko asistentzia — ${equipoNombre} (${fecha})`,
      text: `Kaixo ${destinatario.nombre_visible},\nMesedez, erregistratu gaurko asistentzia talderako: ${equipoNombre}. Ireki: ${link}`,
      html: `<p>Kaixo ${destinatario.nombre_visible},</p><p>Mesedez, erregistratu gaurko asistentzia talderako: <strong>${equipoNombre}</strong>.</p><p><a href="${link}">Ireki</a></p>`,
    }
  }

  return {
    subject: `Por favor, registre la asistencia de hoy — ${equipoNombre} (${fecha})`,
    text: `Hola ${destinatario.nombre_visible},\nPor favor, registre la asistencia de hoy para el equipo ${equipoNombre}. Abrir: ${link}`,
    html: `<p>Hola ${destinatario.nombre_visible},</p><p>Por favor, registre la asistencia de hoy para el equipo <strong>${equipoNombre}</strong>.</p><p><a href="${link}">Abrir</a></p>`,
  }
}

export function buildMinutajeDiaTemplate(
  destinatario: Pick<usuario, 'idioma' | 'nombre_visible'>,
  equipoNombre: string,
  fecha: string,
  link: string,
): EmailContent {
  if (isEuskera(destinatario.idioma)) {
    return {
      subject: `Mesedez, erregistratu gaurko partidaren minutajea — ${equipoNombre} (${fecha})`,
      text: `Kaixo ${destinatario.nombre_visible},\nMesedez, erregistratu gaurko partidaren minutajea talderako: ${equipoNombre}. Ireki: ${link}`,
      html: `<p>Kaixo ${destinatario.nombre_visible},</p><p>Mesedez, erregistratu gaurko partidaren minutajea talderako: <strong>${equipoNombre}</strong>.</p><p><a href="${link}">Ireki</a></p>`,
    }
  }

  return {
    subject: `Por favor, registre el minutaje del partido de hoy — ${equipoNombre} (${fecha})`,
    text: `Hola ${destinatario.nombre_visible},\nPor favor, registre el minutaje del partido de hoy para el equipo ${equipoNombre}. Abrir: ${link}`,
    html: `<p>Hola ${destinatario.nombre_visible},</p><p>Por favor, registre el minutaje del partido de hoy para el equipo <strong>${equipoNombre}</strong>.</p><p><a href="${link}">Abrir</a></p>`,
  }
}

export function buildRecordatorioSemanalTemplate(
  destinatario: Pick<usuario, 'idioma' | 'nombre_visible'>,
  equipos: { nombre: string; link: string }[],
): EmailContent {
  if (isEuskera(destinatario.idioma)) {
    const items = equipos.map((e) => `<li><a href="${e.link}">${e.nombre}</a></li>`).join('')
    const lines = equipos.map((e) => `- ${e.nombre}: ${e.link}`).join('\n')
    return {
      subject: 'Asteroko gogorarazpena: eguneratu zure taldeen datuak',
      text: `Kaixo ${destinatario.nombre_visible},\n\nHau da asteroko gogorarazpena zure taldeen datuak eguneratzeko:\n\n${lines}`,
      html: `<p>Kaixo ${destinatario.nombre_visible},</p><p>Hau da asteroko gogorarazpena zure taldeen datuak eguneratzeko:</p><ul>${items}</ul>`,
    }
  }

  const items = equipos.map((e) => `<li><a href="${e.link}">${e.nombre}</a></li>`).join('')
  const lines = equipos.map((e) => `- ${e.nombre}: ${e.link}`).join('\n')
  return {
    subject: 'Recordatorio semanal: mantenga actualizados los datos de sus equipos',
    text: `Hola ${destinatario.nombre_visible},\n\nEste es el recordatorio semanal para mantener actualizados los datos de sus equipos:\n\n${lines}`,
    html: `<p>Hola ${destinatario.nombre_visible},</p><p>Este es el recordatorio semanal para mantener actualizados los datos de sus equipos:</p><ul>${items}</ul>`,
  }
}
