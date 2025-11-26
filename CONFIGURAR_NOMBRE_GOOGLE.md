# Configurar "Quimera.ai" en el Login de Google

Este documento explica cómo cambiar el nombre que aparece en el popup de Google de "quimeraai.firebaseapp.com" a "Quimera.ai".

## Paso 1: Firebase Console

1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto `quimeraai`
3. En el menú lateral, ve a **Authentication**
4. Click en la pestaña **Settings**
5. Click en la pestaña **Sign-in method**
6. Busca el proveedor **Google** y haz click en el ícono de editar (lápiz)
7. En el modal que se abre:
   - **Public-facing name for project**: Cambia a "**Quimera.ai**"
   - **Support email for project**: Verifica que tengas un email configurado
8. Guarda los cambios

## Paso 2: Google Cloud Console (Importante)

Para que el cambio se refleje completamente en el popup de Google, también debes configurarlo en Google Cloud Console:

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Selecciona tu proyecto (debería ser el mismo que Firebase)
3. En el menú lateral, ve a **APIs & Services** → **OAuth consent screen**
4. Aquí verás la pantalla de configuración de OAuth:
   - **App name**: Cambia a "**Quimera.ai**"
   - **User support email**: Configura un email de soporte
   - **App logo** (opcional): Puedes subir el logo de Quimera.ai
   - **Application home page** (opcional): Puedes poner tu URL
   - **Privacy policy link** (opcional): Si tienes política de privacidad
   - **Terms of service link** (opcional): Si tienes términos de servicio
5. Click en **Save and Continue**

## Paso 3: Verificar Dominios Autorizados

Asegúrate de que los siguientes dominios estén en la lista de dominios autorizados:

1. En Firebase Console → Authentication → Settings → **Authorized domains**
2. Verifica que estén:
   - `localhost` (para desarrollo)
   - `quimeraai.firebaseapp.com`
   - Tu dominio de producción (si lo tienes)

## Cambios Implementados en el Código

Ya he actualizado el código de `components/Auth.tsx` para mejorar la experiencia del login:

```typescript
const handleGoogleSignIn = async () => {
    setError('');
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    
    // Configuraciones personalizadas para mejorar la experiencia
    provider.setCustomParameters({
        prompt: 'select_account', // Siempre mostrar selector de cuenta
        display: 'popup' // Asegurar que se use popup
    });
    
    try {
        console.log('🔐 Intentando login con Google...');
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Login exitoso:', result.user.email);
    } catch (err: any) {
        // ... manejo de errores mejorado
    }
};
```

## Nota Importante

- Los cambios en Google Cloud Console pueden tardar algunos minutos en propagarse
- Es posible que necesites cerrar sesión y limpiar el caché del navegador para ver los cambios
- El popup de Google siempre se abrirá en una ventana nueva (controlada por Google/navegador)
- La posición del popup es manejada por el navegador y Google, no se puede centrar programáticamente

## Tiempo de Propagación

Una vez que hagas los cambios:
- Cambios en Firebase: Inmediatos
- Cambios en Google Cloud Console: 5-15 minutos
- Puede ser necesario cerrar sesión de Google y volver a intentar

## Solución de Problemas

Si después de hacer los cambios aún ves "quimeraai.firebaseapp.com":
1. Limpia el caché del navegador
2. Cierra todas las sesiones de Google
3. Espera 15 minutos para que los cambios se propaguen
4. Intenta de nuevo en una ventana privada/incógnito

## Verificación

Para verificar que funcionó:
1. Intenta hacer login con Google
2. El popup debería mostrar "**to continue to Quimera.ai**" en lugar de "to continue to quimeraai.firebaseapp.com"





