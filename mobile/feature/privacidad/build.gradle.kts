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
        // Las @Preview (src/debug, solo para Android Studio) no son código de la app: no cuentan.
        // Convención: los archivos de previews terminan en `Previews.kt`; sus lambdas generadas
        // (ComposableSingletons$...PreviewsKt) y los datos de muestra se excluyen por nombre.
        filters {
            excludes {
                annotatedBy("androidx.compose.ui.tooling.preview.Preview")
                classes("*PreviewsKt*", "*.MuestrasPreview")
            }
        }
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
    implementation(project(":core:network"))
    implementation(project(":core:security"))
    implementation(project(":core:designsystem"))
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.kotlinx.coroutines.android)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.material.icons.extended)
    // @Preview en src/debug: la anotación y el renderizado de Android Studio no llegan a release.
    debugImplementation(libs.androidx.compose.ui.tooling.preview)
    debugImplementation(libs.androidx.compose.ui.tooling)

    testImplementation(platform(libs.junit5.bom))
    testImplementation(libs.junit5.jupiter)
    testImplementation(libs.kotlin.test)
    testImplementation(libs.mockk)
    testImplementation(libs.turbine)
    testImplementation(libs.kotlinx.coroutines.test)
    // Simulador de bff-movil para las pruebas del repositorio.
    testImplementation(libs.okhttp.mockwebserver)
    // Pruebas de semántica de Compose en la JVM (Robolectric, JUnit 4 sobre el motor vintage).
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.compose.ui.test.junit4)
    testImplementation(libs.junit)
    testRuntimeOnly(libs.junit5.vintage.engine)
    testRuntimeOnly(libs.junit5.platform.launcher)
    // Declara la ComponentActivity de prueba en el manifiesto de las pruebas (debug y release).
    testImplementation(libs.androidx.compose.ui.test.manifest)
}
