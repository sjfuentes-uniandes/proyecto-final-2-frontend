package com.solventa.feature.onboardingidentidad

import java.io.File
import org.junit.Test
import kotlin.test.assertTrue

/**
 * Guardia de regresión del AC4: este módulo maneja la selfie y no debe registrarla en logs ni
 * escribirla en disco, galería o preferencias. Revisa el código fuente en busca de las APIs que
 * lo harían; si una es legítima, hay que revisarla a conciencia antes de añadirla aquí.
 */
class AuditoriaSeguridadTest {
    private val fuentes: List<File> = File("src/main/kotlin")
        .walkTopDown()
        .filter { it.isFile && it.extension == "kt" }
        .toList()

    private fun usosDe(patron: Regex): List<String> = fuentes.flatMap { archivo ->
        archivo.readLines().withIndex()
            .filter { (_, linea) -> patron.containsMatchIn(linea) && !linea.trimStart().startsWith("*") && !linea.trimStart().startsWith("//") }
            .map { (indice, linea) -> "${archivo.name}:${indice + 1}: ${linea.trim()}" }
    }

    @Test
    fun `la auditoria revisa codigo real`() {
        assertTrue(fuentes.size >= 10, "No se encontraron fuentes que auditar: ${fuentes.size}")
    }

    @Test
    fun `no escribe logs`() {
        val logs = Regex("""\bLog\.|\bprintln\(|\bprint\(|Timber|printStackTrace|HttpLoggingInterceptor""")

        assertTrue(usosDe(logs).isEmpty(), "Hay logs en el modulo de verificacion: ${usosDe(logs)}")
    }

    @Test
    fun `no escribe archivos ni usa galeria ni preferencias`() {
        val disco = Regex(
            """FileOutputStream|FileWriter|createTempFile|\bcacheDir\b|\bfilesDir\b|externalCacheDir|""" +
                """getExternalFilesDir|MediaStore|openFileOutput|SharedPreferences|ImageCapture|OutputFileOptions|""" +
                """\bRoom\b|DataStore""",
        )

        assertTrue(usosDe(disco).isEmpty(), "Hay escritura a disco en el modulo de verificacion: ${usosDe(disco)}")
    }
}
