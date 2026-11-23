package com.solventa.feature.billetera.ui

import androidx.annotation.StringRes
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.solventa.feature.billetera.R
import com.solventa.feature.billetera.dominio.Cobertura

/**
 * Nombre de una cobertura en el idioma de la app. El backend la entrega en español; aquí se traduce por
 * código (values/ es-CO y values-en-rUS/ en-US). Un código que no está en la tabla muestra el nombre del
 * backend. Al agregar una cobertura al catálogo, agregar su texto en los dos `strings.xml`.
 */
@StringRes
internal fun textoCobertura(codigo: String): Int? = when (codigo) {
    "MUERTE" -> R.string.cobertura_muerte
    "INCAPACIDAD_TOTAL_PERMANENTE", "INCAPACIDAD" -> R.string.cobertura_incapacidad_total_permanente
    "ENFERMEDADES_GRAVES" -> R.string.cobertura_enfermedades_graves
    "AUXILIO_FUNERARIO" -> R.string.cobertura_auxilio_funerario
    "LLUVIA_ACUMULADA" -> R.string.cobertura_lluvia_acumulada
    "INCENDIO" -> R.string.cobertura_incendio
    "HURTO" -> R.string.cobertura_hurto
    else -> null
}

@Composable
fun nombreCobertura(cobertura: Cobertura): String =
    textoCobertura(cobertura.codigo)?.let { stringResource(it) } ?: cobertura.nombre

/** Ramo por su código (VIDA, VIDA_HIPOTECARIO, HOGAR, PARAMETRICO); otro valor se muestra como llega. */
@StringRes
internal fun textoRamo(ramo: String): Int? = when (ramo) {
    "VIDA" -> R.string.ramo_vida
    "VIDA_HIPOTECARIO" -> R.string.ramo_vida_hipotecario
    "HOGAR" -> R.string.ramo_hogar
    "PARAMETRICO" -> R.string.ramo_parametrico
    else -> null
}

@Composable
fun nombreRamo(ramo: String): String = textoRamo(ramo)?.let { stringResource(it) } ?: ramo
