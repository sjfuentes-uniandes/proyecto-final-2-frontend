package com.solventa.feature.billetera.ui

import java.math.BigDecimal
import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

private const val LARGO_HUELLA_VISIBLE = 8

/** Monto con separadores del idioma (es-CO: 300.000.000; en-US: 300,000,000); con decimales solo si los tiene. */
internal fun formatearMonto(monto: BigDecimal, idioma: Locale): String =
    NumberFormat.getNumberInstance(idioma).apply {
        minimumFractionDigits = if (monto.stripTrailingZeros().scale() > 0) 2 else 0
        maximumFractionDigits = 2
    }.format(monto)

/** Fecha larga en el idioma del dispositivo; las vigencias son fechas de calendario, sin zona. */
internal fun formatearFecha(fecha: LocalDate, idioma: Locale): String =
    DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).withLocale(idioma).format(fecha)

/** La huella completa no se muestra: solo sus primeros caracteres. */
internal fun abreviarHuella(huella: String): String = huella.take(LARGO_HUELLA_VISIBLE)
