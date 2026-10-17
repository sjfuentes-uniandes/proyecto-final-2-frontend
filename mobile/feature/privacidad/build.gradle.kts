import kotlinx.kover.gradle.plugin.dsl.CoverageUnit

plugins {
    id("solventa.android.library")
    id("solventa.android.compose")
    alias(libs.plugins.kover)
}

android {
    namespace = "com.solventa.feature.privacidad"

    testOptions {
        // Robolectric necesita los recursos fusionados para resolver cadenas por idioma.
        unitTests.isIncludeAndroidResources = true
        unitTests.all { it.useJUnitPlatform() }
    }
}

// Umbral de la estrategia de pruebas para móvil: ≥ 80 % líneas / ≥ 75 % ramas.
kover {
    reports {
        total {
            verify {
                rule("Cobertura de :feature:privacidad") {
                    bound {
                        minValue = 80
                        coverageUnits = CoverageUnit.LINE
                    }
                    bound {
                        minValue = 75
                        coverageUnits = CoverageUnit.BRANCH
                    }
                }
            }
        }
    }
}

dependencies {
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)

    testImplementation(platform(libs.junit5.bom))
    testImplementation(libs.junit5.jupiter)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    // Pruebas de semántica de Compose en la JVM (Robolectric, JUnit 4 sobre el motor vintage).
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.junit)
    testRuntimeOnly(libs.junit5.vintage.engine)
    testRuntimeOnly(libs.junit5.platform.launcher)
    // Declara la ComponentActivity de prueba en el manifiesto de las pruebas (debug y release).
    testImplementation(libs.androidx.compose.ui.test.manifest)
}
