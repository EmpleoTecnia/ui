import type { Demo } from '../../../lib/demo'
import { RichTextEditor } from './RichTextEditor'
import { DemoRichTextEditor } from './DemoRichTextEditor'

const CURSO = `# Diseño UX para productos digitales

Un curso de **ocho semanas**, en vivo y a distancia, para aprender a diseñar interfaces que la gente entienda a la primera. Seleccioná cualquier texto para darle formato, o escribí \`/\` en una línea vacía para agregar bloques.

## Qué vas a aprender

- Investigación con usuarios y _entrevistas_ que sirven
- Prototipos en Figma, de baja a alta fidelidad
- Accesibilidad desde el primer boceto

> Cupo limitado: 25 personas por comisión.`

const OFERTA = `## Desarrollador front-end

Buscamos a alguien con **tres años** de experiencia en React para sumarse al equipo de producto.

- Trabajo remoto, con reuniones en horario de Argentina
- Stack: TypeScript, Next.js y Tailwind`

const demos: Demo[] = [
  {
    nombre: 'Descripción de un curso',
    render: () => (
      <div className="w-[480px] rounded-ui-lg border border-ui-line bg-ui-surface p-5">
        <RichTextEditor aria-label="Descripción del curso" defaultMarkdown={CURSO} />
      </div>
    ),
  },
  {
    nombre: 'Con salida en Markdown y HTML',
    render: () => (
      <div className="w-[480px]">
        <DemoRichTextEditor markdown={OFERTA} />
      </div>
    ),
  },
  {
    nombre: 'Vacío',
    render: () => (
      <div className="w-[420px] rounded-ui-lg border border-ui-line bg-ui-surface p-5">
        <RichTextEditor aria-label="Mensaje" placeholder="Escribí el mensaje para los inscriptos" />
      </div>
    ),
  },
  {
    nombre: 'Sólo lectura',
    render: () => (
      <div className="w-[420px] rounded-ui-lg border border-ui-line bg-ui-surface p-5">
        <RichTextEditor aria-label="Descripción" defaultMarkdown={OFERTA} readOnly />
      </div>
    ),
  },
]
export default demos
