import java.util.Properties

plugins {
    id("solventa.android.application")
    id("solventa.android.compose")
}

// Config pública (no secretos) de Cognito/bff-movil para esta máquina de desarrollo; vive en
// local.properties (gitignored). Ver mobile/local.properties.example para las claves esperadas.
val propiedadesLocales = Properties().apply {
    val archivo = rootProject.file("local.properties")
    if (archivo.exists()) archivo.inputStream().use { load(it) }
}

fun propiedadLocal(clave: String, porDefecto: String) = propiedadesLocales.getProperty(clave, porDefecto)

android {
    namespace = "com.solventa.app"

    defaultConfig {
        applicationId = "com.solventa.app"
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // 10.0.2.2 es cómo el emulador de Android ve el `localhost` de la máquina anfitriona
        // (bff-movil corriendo en docker compose, ver README del repo back).
        buildConfigField("String", "BFF_MOVIL_BASE_URL", "\"${propiedadLocal("bffMovilBaseUrl", "http://10.0.2.2:8081/")}\"")
        buildConfigField("String", "COGNITO_POOL_ID", "\"${propiedadLocal("cognitoPoolId", "")}\"")
        buildConfigField("String", "COGNITO_CLIENT_ID", "\"${propiedadLocal("cognitoClientId", "")}\"")
        buildConfigField("String", "COGNITO_REGION", "\"${propiedadLocal("cognitoRegion", "us-east-1")}\"")

        // Solo desarrollo contra el backend local; en release quedan vacíos (ver buildTypes.debug).
        buildConfigField("String", "SUB_LOCAL", "\"\"")
        buildConfigField("String", "SELFIE_DE_PRUEBA_LOCAL", "\"\"")
    }

    buildTypes {
        debug {
            // El backend local (ENVIRONMENT=local) no usa Cognito: identifica al titular por
            // X-Authenticated-Sub, y su simulador de KYC decide por el texto de la selfie.
            buildConfigField("String", "SUB_LOCAL", "\"${propiedadLocal("subLocal", "persona-de-prueba-1")}\"")
            buildConfigField("String", "SELFIE_DE_PRUEBA_LOCAL", "\"${propiedadLocal("selfieDePruebaLocal", "selfie-sintetica-aprobada")}\"")
        }
        release {
            isMinifyEnabled = false
        }
    }

    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation(project(":core:auth"))
    implementation(project(":core:network"))
    implementation(project(":core:security"))
    implementation(project(":core:designsystem"))
    implementation(project(":feature:login"))
    implementation(project(":feature:onboarding-identidad"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    debugImplementation(libs.androidx.compose.ui.tooling)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.test.ext.junit)
    androidTestImplementation(libs.androidx.test.espresso.core)
}
