import {
  LegalDocCard,
  LegalDocShell,
  LegalSection,
  LegalSubsection,
} from '@/components/legal-doc-shell'

export const metadata = {
  title: 'Política de Privacidad — Dilo',
  description: 'Cómo recopilamos, usamos y protegemos tu información en Dilo.',
}

export default function PrivacyPage() {
  const lastUpdated = '23 de abril de 2026'

  return (
    <LegalDocShell crossLink={{ href: '/terms', label: 'Términos de Servicio' }}>
      <LegalDocCard title="Política de Privacidad" lastUpdated={lastUpdated}>
        <section>
          <p>
            En <strong>Dilo</strong> (<a href="https://getdilo.io">getdilo.io</a>), producto de{' '}
            <strong>Mordecai Technologies LLC</strong>, nos tomamos en serio la privacidad de nuestros
            usuarios. Esta Política describe qué información recopilamos, cómo la usamos y qué derechos
            tienes sobre ella.
          </p>
          <p className="mt-3">Al usar Dilo, aceptas las prácticas descritas en este documento.</p>
        </section>

        <LegalSection title="1. Quiénes somos">
          <p>
            <strong>Mordecai Technologies LLC</strong> es el responsable del tratamiento de los datos
            personales tratados a través de Dilo: una plataforma SaaS que permite a organizaciones crear
            flujos conversacionales inteligentes para captura y análisis de datos. Para ejercer derechos o
            consultas de privacidad, escríbenos a{' '}
            <a href="mailto:privacidad@modecaitech.com">privacidad@modecaitech.com</a>.
          </p>
        </LegalSection>

        <LegalSection title="2. Información que recopilamos">
          <LegalSubsection title="2.1 Datos de cuenta">
            <p>Cuando te registras recopilamos:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Nombre y apellido</li>
              <li>Correo electrónico</li>
              <li>Número de teléfono (opcional)</li>
              <li>
                Información de autenticación gestionada por Clerk (contraseña hasheada o tokens OAuth de
                Google)
              </li>
            </ul>
          </LegalSubsection>
          <LegalSubsection title="2.2 Datos de uso del servicio">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Flows creados: nombre, descripción, pasos y configuración</li>
              <li>Sesiones completadas por usuarios finales de tus flows</li>
              <li>Respuestas ingresadas en tus flows (pueden incluir datos de terceros)</li>
              <li>Archivos subidos a través de flows (gestionados por Uploadthing)</li>
            </ul>
          </LegalSubsection>
          <LegalSubsection title="2.3 Datos técnicos">
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Dirección IP y datos de navegación básicos</li>
              <li>Registros de errores y métricas de rendimiento</li>
              <li>Metadatos de sesiones (hora de inicio, estado, dispositivo)</li>
            </ul>
          </LegalSubsection>
        </LegalSection>

        <LegalSection title="3. Cómo usamos tu información">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Prestar el servicio:</strong> Crear, almacenar y procesar tus flows y sesiones.
            </li>
            <li>
              <strong>Análisis con IA:</strong> Las respuestas de las sesiones completadas se envían a
              OpenAI (GPT-4o) para generar resúmenes, clasificaciones y puntuaciones. OpenAI procesa estos
              datos bajo acuerdo de procesamiento de datos con Mordecai Technologies LLC y no los usa para
              entrenar sus modelos.
            </li>
            <li>
              <strong>Comunicaciones transaccionales:</strong> Enviar notificaciones relacionadas con tu
              cuenta (vía Resend).
            </li>
            <li>
              <strong>Mejorar el servicio:</strong> Analizar patrones de uso de forma agregada y anónima.
            </li>
            <li>
              <strong>Cumplimiento legal:</strong> Responder a requerimientos legales cuando aplique.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="4. Terceros que acceden a tus datos">
          <p className="mb-3">Trabajamos con los siguientes proveedores de confianza:</p>
          <div className="overflow-x-auto rounded-lg border border-[#E5E7EB] dark:border-[#2A2F3F]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] dark:bg-[#252836]">
                  <th className="border-b border-[#E5E7EB] p-3 text-left font-semibold text-[#111827] dark:border-[#2A2F3F] dark:text-[#F3F4F6]">
                    Proveedor
                  </th>
                  <th className="border-b border-l border-[#E5E7EB] p-3 text-left font-semibold text-[#111827] dark:border-[#2A2F3F] dark:text-[#F3F4F6]">
                    Propósito
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Clerk', 'Autenticación y gestión de usuarios'],
                  ['Neon (PostgreSQL)', 'Almacenamiento de base de datos'],
                  ['Vercel', 'Infraestructura y hosting'],
                  ['OpenAI', 'Análisis de respuestas con IA'],
                  ['Uploadthing', 'Almacenamiento de archivos subidos'],
                  ['Resend', 'Envío de correos transaccionales'],
                ].map(([provider, purpose]) => (
                  <tr
                    key={provider}
                    className="even:bg-[#FAFAFA] dark:even:bg-[#1F222E]"
                  >
                    <td className="border-b border-[#E5E7EB] p-3 font-medium text-[#111827] dark:border-[#2A2F3F] dark:text-[#E5E7EB]">
                      {provider}
                    </td>
                    <td className="border-b border-l border-[#E5E7EB] p-3 text-[#6B7280] dark:border-[#2A2F3F] dark:text-[#9CA3AF]">
                      {purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            No vendemos tus datos a terceros ni los compartimos con fines publicitarios.
          </p>
        </LegalSection>

        <LegalSection title="5. Datos de usuarios finales de tus flows">
          <p>
            Cuando creas un flow y lo compartes con otras personas, esas personas responden preguntas que
            pueden contener datos personales. Como creador del flow, eres el responsable de informar a
            esas personas que sus datos serán procesados a través de Dilo y de obtener su consentimiento
            cuando corresponda.
          </p>
          <p className="mt-3">Dilo actúa como encargado del tratamiento de estos datos en nombre tuyo.</p>
        </LegalSection>

        <LegalSection title="6. Retención de datos">
          <ul className="list-disc space-y-2 pl-5">
            <li>Los datos de cuenta se conservan mientras la cuenta esté activa.</li>
            <li>Al eliminar tu cuenta, tus flows, sesiones y respuestas son eliminados en un plazo de 30 días.</li>
            <li>Los registros técnicos se conservan por un máximo de 90 días.</li>
          </ul>
        </LegalSection>

        <LegalSection title="7. Seguridad">
          <p>
            Todos los datos se transmiten cifrados mediante TLS/HTTPS. La base de datos está alojada en Neon
            con cifrado en reposo.             El acceso a los datos de producción está restringido al equipo técnico autorizado por Mordecai
            Technologies LLC mediante controles de acceso estrictos.
          </p>
        </LegalSection>

        <LegalSection title="8. Tus derechos">
          <p className="mb-3">
            Según la legislación aplicable (incluyendo la Ley 1581 de 2012 de Colombia y normas equivalentes
            en otros países de la región), tienes derecho a:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Acceder</strong> a los datos personales que tenemos sobre ti
            </li>
            <li>
              <strong>Rectificar</strong> información incorrecta o desactualizada
            </li>
            <li>
              <strong>Eliminar</strong> tu cuenta y los datos asociados
            </li>
            <li>
              <strong>Portar</strong> tus datos en formato estructurado
            </li>
            <li>
              <strong>Oponerte</strong> al tratamiento en ciertos casos
            </li>
          </ul>
          <p className="mt-3">
            Para ejercer cualquiera de estos derechos escríbenos a{' '}
            <a href="mailto:privacidad@modecaitech.com">privacidad@modecaitech.com</a>.
          </p>
        </LegalSection>

        <LegalSection title="9. Cookies">
          <p>
            Dilo usa cookies estrictamente necesarias para el funcionamiento de la sesión (gestionadas por
            Clerk). No usamos cookies de seguimiento ni publicidad.
          </p>
        </LegalSection>

        <LegalSection title="10. Cambios a esta política">
          <p>
            Podemos actualizar esta política ocasionalmente. Te notificaremos por correo ante cambios
            materiales. El uso continuado del servicio tras la notificación implica aceptación de los
            cambios.
          </p>
        </LegalSection>

        <LegalSection title="11. Contacto">
          <p>
            ¿Preguntas sobre privacidad? Escríbenos a{' '}
            <a href="mailto:privacidad@modecaitech.com">privacidad@modecaitech.com</a>.
          </p>
        </LegalSection>
      </LegalDocCard>
    </LegalDocShell>
  )
}
