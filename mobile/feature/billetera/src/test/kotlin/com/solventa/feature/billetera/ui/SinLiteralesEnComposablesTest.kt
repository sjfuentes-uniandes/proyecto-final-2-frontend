package com.solventa.feature.billetera.ui

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.io.TempDir
import java.io.File
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlin.test.fail

/**
 * El lint de Android (`HardcodedText`) solo revisa recursos XML: no ve un `Text("Hola")` en
 * Compose. Esta prueba lee el código fuente de `:feature:billetera` y falla si un archivo que
 * declara `@Composable` contiene un literal de texto con letras. Todo texto visible debe venir de
 * `stringResource` (values/ es-CO y values-en-rUS/ en-US).
 *
 * Mismo criterio y límites que la de `:feature:privacidad`: análisis léxico, no del árbol de
 * sintaxis; no revisa archivos sin `@Composable`, ni texto que llegue del servidor ya armado, ni
 * cadenas sin letras (", ", "%") usadas como separadores.
 */
class SinLiteralesEnComposablesTest {
    @Test
    fun `los composables de billetera no tienen literales de texto`() {
        val fuentes = File("src/main/kotlin")
        assertTrue(fuentes.isDirectory, "La prueba corre desde el directorio del módulo: ${fuentes.absolutePath}")

        val hallazgos = hallazgosEn(fuentes)

        if (hallazgos.isNotEmpty()) {
            fail("Textos literales en composables (use stringResource):\n" + hallazgos.joinToString("\n"))
        }
    }

    @Test
    fun `el escaneo falla ante un literal dentro de un composable y pasa sin el`(@TempDir carpeta: File) {
        val archivo = File(carpeta, "Pantalla.kt")

        archivo.writeText("@Composable\nfun P() {\n    Text(\"Hola mundo\")\n}\n")
        assertEquals(listOf("Pantalla.kt:3 \"Hola mundo\""), hallazgosEn(carpeta))

        archivo.writeText("@Composable\nfun P() {\n    Text(stringResource(R.string.saludo))\n}\n")
        assertEquals(emptyList(), hallazgosEn(carpeta))
    }

    @Test
    fun `el detector encuentra un literal visible y no se confunde con plantillas ni comentarios`() {
        val codigo = """
            @Composable
            fun Ejemplo(nombre: String) {
                // "Un comentario" no cuenta
                Text("Hola mundo")
                Text(stringResource(R.string.saludo, "${'$'}nombre"))
                Text(text = "Adiós \"amigo\"")
                val separador = ", "
                /* "Bloque" tampoco */
            }
        """.trimIndent()

        assertEquals(
            listOf(4 to "\"Hola mundo\"", 6 to "\"Adiós \\\"amigo\\\"\""),
            literalesConLetras(codigo),
        )
    }
}

private fun hallazgosEn(fuentes: File): List<String> =
    fuentes.walkTopDown()
        .filter { it.isFile && it.extension == "kt" && it.readText().contains("@Composable") }
        .flatMap { archivo ->
            literalesConLetras(archivo.readText()).map { (linea, literal) -> "${archivo.name}:$linea $literal" }
        }
        .toList()

private val LITERAL = Regex("\"(?:[^\"\\\\\\n]|\\\\.)*\"")
private val PLANTILLA = Regex("\\$\\{[^}]*\\}|\\$[A-Za-z_][A-Za-z0-9_]*")

/** (número de línea, literal) de cada literal con alguna letra fuera de las plantillas `$x`. */
internal fun literalesConLetras(codigo: String): List<Pair<Int, String>> {
    val sinComentarios = codigo
        .replace(Regex("/\\*.*?\\*/", RegexOption.DOT_MATCHES_ALL)) { coincidencia -> coincidencia.value.replace(Regex("[^\\n]"), " ") }
    return sinComentarios.lines().flatMapIndexed { indice, linea ->
        val codigoDeLinea = linea.substringBeforeComentario()
        LITERAL.findAll(codigoDeLinea)
            .map { it.value }
            .filter { literal -> PLANTILLA.replace(literal, "").any(Char::isLetter) }
            .map { (indice + 1) to it }
            .toList()
    }
}

/** Corta un comentario `//` que no esté dentro de un literal. */
private fun String.substringBeforeComentario(): String {
    var dentro = false
    var i = 0
    while (i < length) {
        val c = this[i]
        when {
            c == '\\' && dentro -> i++
            c == '"' -> dentro = !dentro
            c == '/' && !dentro && getOrNull(i + 1) == '/' -> return substring(0, i)
        }
        i++
    }
    return this
}
