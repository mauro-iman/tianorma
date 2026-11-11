# Setup de WhatsApp (Meta): checklist

Esto lo tiene que hacer Mauro: requiere cuentas, un chip y aceptar los términos de Meta. **Conviene arrancarlo hoy (mié 11).** Si algo no coincide con lo que muestra Meta, la documentación oficial manda: <https://developers.facebook.com/docs/whatsapp/cloud-api>

## 1. El número

- [ ] Conseguir un **chip o número que NO esté registrado en WhatsApp** (ni en la app común ni en Business). Si ya lo estuvo, hay que borrar esa cuenta primero.
- [ ] Que pueda recibir un SMS o una llamada para la verificación.
- [ ] **Hasta el martes 17 no se pierde ni se da de baja ese chip.**

## 2. La app de Meta

- [ ] Cuenta de Meta for Developers y un portfolio de Meta Business.
- [ ] Crear una app de tipo **Business** y agregarle el producto **WhatsApp**.
- [ ] En *API Setup*, agregar el número propio y verificarlo.
- [ ] **Nombre visible (display name):** Meta lo revisa y puede rechazar los nombres genéricos. "Mi Página" podría no pasar; tener una alternativa como "Página de Norma" o "Taller de Norma". Esta revisión puede demorar: **pedirlo cuanto antes**.

## 3. Token permanente

- [ ] Crear un **System User** en Business Settings, asignarle la app y la cuenta de WhatsApp, y generar un token permanente con los permisos `whatsapp_business_messaging` y `whatsapp_business_management`. (El token temporal vence en unas 24 horas.)
- [ ] Guardarlo en las variables de entorno de Vercel, **nunca en el repo**.

## 4. Webhook (cuando esté la función en Vercel)

- [ ] Callback URL: `https://<dominio>.vercel.app/api/whatsapp`.
- [ ] Verify token: un texto inventado, que también va en las variables de entorno.
- [ ] Suscribirse al campo **`messages`**.

## 5. Pasar a modo Live

- [ ] URL de política de privacidad: `https://tianorma.vercel.app/privacidad`.
- [ ] Cambiar la app de *Development* a *Live*.
- [ ] Probar desde un celular que **no** sea de los números de prueba.

## Datos que necesito después (por variables de entorno, no por chat)

`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` (para validar la firma de los webhooks) y la lista de números autorizados como "tía".
