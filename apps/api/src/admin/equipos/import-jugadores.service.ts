import { Injectable } from '@nestjs/common'
import ExcelJS from 'exceljs'
import { PrismaService } from '../../prisma/prisma.service'

export interface MiembroPreview {
  row: number
  nombre: string
  alias?: string
  fecha_incorporacion: string
}

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface ImportPreview {
  valid: MiembroPreview[]
  errors: ImportError[]
}

const NOMBRE_HEADERS = ['nombre', 'izena']
const ALIAS_HEADERS = ['alias']
const FECHA_HEADERS = ['fecha_incorporacion', 'sarrera_data']

@Injectable()
export class ImportJugadoresService {
  constructor(private readonly prisma: PrismaService) {}

  async parse(buffer: Buffer): Promise<ImportPreview> {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer)
    const sheet = workbook.worksheets[0]

    const headerRow = sheet.getRow(1)
    const columnIndex = mapColumns(headerRow)

    const valid: MiembroPreview[] = []
    const errors: ImportError[] = []

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber)
      if (row.cellCount === 0 || row.values === undefined || (row.values as unknown[]).length === 0) {
        continue
      }

      const nombre = readCell(row, columnIndex.nombre)
      const alias = readCell(row, columnIndex.alias)
      const fechaRaw = readCell(row, columnIndex.fecha)

      if (!nombre) {
        errors.push({ row: rowNumber, field: 'nombre', message: 'nombre es obligatorio' })
        continue
      }

      const fecha = parseFecha(fechaRaw)
      if (!fecha) {
        errors.push({
          row: rowNumber,
          field: 'fecha_incorporacion',
          message: 'fecha_incorporacion es obligatoria y debe ser ISO (YYYY-MM-DD) o DD/MM/YYYY',
        })
        continue
      }

      valid.push({ row: rowNumber, nombre, alias: alias || undefined, fecha_incorporacion: fecha })
    }

    return { valid, errors }
  }

  async persist(equipoId: string, preview: MiembroPreview[]) {
    const created: string[] = []

    for (const row of preview) {
      const persona = await this.prisma.persona.create({
        data: { nombre: row.nombre, alias: row.alias },
      })

      await this.prisma.miembro_equipo.create({
        data: {
          equipo_id: equipoId,
          persona_id: persona.id,
          grupo: 'con_ficha',
          fecha_incorporacion: new Date(row.fecha_incorporacion),
          orden: 0,
        },
      })

      created.push(persona.id)
    }

    return { created: created.length }
  }
}

function mapColumns(headerRow: ExcelJS.Row) {
  const index: { nombre?: number; alias?: number; fecha?: number } = {}

  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value ?? '').trim().toLowerCase()
    if (NOMBRE_HEADERS.includes(header)) index.nombre = colNumber
    if (ALIAS_HEADERS.includes(header)) index.alias = colNumber
    if (FECHA_HEADERS.includes(header)) index.fecha = colNumber
  })

  return index
}

function readCell(row: ExcelJS.Row, colNumber: number | undefined): string {
  if (!colNumber) return ''
  const value = row.getCell(colNumber).value
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

function parseFecha(raw: string): string | null {
  if (!raw) return null

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (isoMatch) return raw

  const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return `${year}-${month}-${day}`
  }

  return null
}
