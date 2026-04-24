import { LegalDocCard, LegalDocShell, LegalSection } from '@/components/legal-doc-shell'

export const metadata = {
  title: 'Términos de Servicio — Dilo',
  description: 'Condiciones que rigen el uso de Dilo y sus servicios.',
}

export default function TermsPage() {
  const lastUpdated = '23 de abril de 2026'

  return (
    <LegalDocShell crossLink={{ href: '/privacy', label: 'Política de Privacidad' }}>
      <LegalDocCard title="Términos de Servicio" lastUpdated={lastUpdated}>
        <section>
          <p>
            Estos Términos de Servicio rigen el uso de <strong>Dilo</strong> (
            <a href="https://getdilo.io">getdilo.io</a>), el servicio de flujos conversacionales
            inteligentes comercializado por <strong>Mordecai Technologies LLC</strong>. Al crear una cuenta o
            usar el servicio, aceptas estos términos en su totalidad frente a Mordecai Technologies LLC.
          </p>
          <p className="mt-3">
            Cuando decimos «Dilo» en este documento nos referimos a ese producto y servicio en línea; la
            contraparte contractual es <strong>Mordecai Technologies LLC</strong>.
          </p>
          <p className="mt-3">
            Si usas Dilo en nombre de una organización, aceptas estos términos en nombre de dicha organización
            y garantizas que tienes autoridad para hacerlo.
          </p>
        </section>

        <LegalSection title="1. Descripción del servicio">
          <p>
            Dilo es una plataforma SaaS que permite a sus usuarios crear flujos conversacionales a partir de
            texto, capturar respuestas de usuarios finales, analizar resultados mediante inteligencia
            artificial, y conectar los datos con herramientas externas mediante webhooks e integraciones.
          </p>
        </LegalSection>

        <LegalSection title="2. Registro y cuenta">
          <ul className="list-disc space-y-2 pl-5">
            <li>Debes tener al menos 18 años para crear una cuenta.</li>
            <li>Eres responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
            <li>Debes proporcionar información veraz y mantenerla actualizada.</li>
            <li>
              Notificarás de inmediato a Mordecai Technologies LLC ante cualquier uso no autorizado de tu
              cuenta.
            </li>
            <li>
              Cada cuenta corresponde a una organización. No está permitido compartir acceso entre múltiples
              organizaciones sin suscripción adicional.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Uso aceptable">
          <p className="mb-3">
            Al usar Dilo, te comprometes a <strong>no</strong>:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              Crear flows con contenido ilegal, fraudulento, engañoso, difamatorio o que viole derechos de
              terceros.
            </li>
            <li>Recopilar datos de usuarios finales sin su consentimiento informado.</li>
            <li>Usar el servicio para enviar spam o comunicaciones no solicitadas.</li>
            <li>Intentar acceder a cuentas de otros usuarios o a los sistemas de Dilo sin autorización.</li>
            <li>Realizar ingeniería inversa, descompilar o extraer el código fuente de Dilo.</li>
            <li>Sobrecargar los servidores de Dilo con requests automatizados de forma abusiva.</li>
            <li>Revender o sublicenciar el acceso a Dilo sin autorización expresa.</li>
          </ul>
          <p className="mt-3">
            Nos reservamos el derecho de suspender o eliminar cuentas que violen estas condiciones sin previo
            aviso.
          </p>
        </LegalSection>

        <LegalSection title="4. Planes y pagos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Dilo ofrece un plan gratuito con límites en flows, sesiones y miembros.</li>
            <li>Los planes de pago se facturan mensualmente por adelantado.</li>
            <li>Los precios pueden cambiar con 30 días de aviso previo a suscriptores activos.</li>
            <li>No hay reembolsos por períodos parciales salvo que la ley lo requiera.</li>
            <li>
              El incumplimiento de pago puede resultar en la suspensión del servicio tras un período de gracia
              de 7 días.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Tus datos y contenido">
          <p>
            Conservas todos los derechos sobre los flows que creas y los datos recopilados a través de ellos.
            Al usar Dilo, nos otorgas una licencia limitada, no exclusiva y revocable para almacenar y
            procesar ese contenido con el único fin de prestar el servicio.
          </p>
          <p className="mt-3">
            Eres el único responsable del contenido de tus flows y de obtener los consentimientos necesarios
            de los usuarios finales que los completen.
          </p>
        </LegalSection>

        <LegalSection title="6. Inteligencia artificial">
          <p>
            Mordecai Technologies LLC utiliza modelos de lenguaje de OpenAI, a través de Dilo, para generar
            flujos a partir de texto y para analizar
            las respuestas de sesiones completadas. El uso de IA está sujeto a las políticas de uso aceptable
            de OpenAI. Los resultados generados por IA son orientativos y no sustituyen el juicio humano en
            decisiones importantes.
          </p>
        </LegalSection>

        <LegalSection title="7. Disponibilidad y SLA">
          <p>
            Nos esforzamos por mantener el servicio Dilo disponible de forma continua, pero no garantizamos
            una
            disponibilidad del 100%. El servicio puede interrumpirse por mantenimiento programado (con aviso
            previo), fallos de infraestructura de terceros o causas de fuerza mayor. No ofrecemos un SLA
            formal en el plan gratuito.
          </p>
        </LegalSection>

        <LegalSection title="8. Propiedad intelectual">
          <p>
            Dilo y todos sus componentes (diseño, código, marca, nombre) son propiedad exclusiva de Mordecai
            Technologies LLC y están protegidos por las leyes de propiedad intelectual aplicables. El uso
            del servicio no te otorga ningún derecho sobre la propiedad intelectual de Mordecai Technologies
            LLC.
          </p>
        </LegalSection>

        <LegalSection title="9. Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley, Mordecai Technologies LLC no será responsable por daños
            indirectos,
            incidentales, especiales o consecuentes, incluyendo pérdida de beneficios o datos, derivados del
            uso o incapacidad de uso del servicio.
          </p>
          <p className="mt-3">
            La responsabilidad total de Mordecai Technologies LLC hacia ti no superará el importe pagado por
            el servicio en los 3
            meses anteriores al evento que originó la reclamación.
          </p>
        </LegalSection>

        <LegalSection title="10. Terminación">
          <p>
            Puedes cancelar tu cuenta en cualquier momento desde la configuración de tu perfil. Tras la
            cancelación, tus datos serán eliminados en un plazo de 30 días salvo obligación legal de
            conservarlos.
          </p>
          <p className="mt-3">
            Mordecai Technologies LLC puede suspender o terminar tu acceso ante violaciones de estos
            términos, con o sin aviso
            previo dependiendo de la gravedad del incumplimiento.
          </p>
        </LegalSection>

        <LegalSection title="11. Modificaciones">
          <p>
            Podemos modificar estos términos en cualquier momento. Los cambios materiales serán notificados
            por correo electrónico con al menos 15 días de antelación. El uso continuado tras la fecha de
            vigencia de los nuevos términos implica su aceptación.
          </p>
        </LegalSection>

        <LegalSection title="12. Ley aplicable">
          <p>
            Estos términos se rigen por las leyes de la República de Colombia. Cualquier controversia se
            resolverá en primera instancia mediante mediación y, de no llegarse a acuerdo, ante los tribunales
            competentes de la ciudad de Bogotá, Colombia.
          </p>
        </LegalSection>

        <LegalSection title="13. Contacto">
          <p>
            Para cualquier consulta sobre estos términos, escríbenos a{' '}
            <a href="mailto:legal@modecaitech.com">legal@modecaitech.com</a>.
          </p>
        </LegalSection>
      </LegalDocCard>
    </LegalDocShell>
  )
}
