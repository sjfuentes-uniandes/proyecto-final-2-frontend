package com.solventa.feature.siniestros.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.ReportProblem
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.solventa.core.designsystem.SolventaTema
import com.solventa.feature.siniestros.R
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.DateTimeParseException
import java.time.format.FormatStyle

internal val AREA_TACTIL = 48.dp
private val formaTarjeta = RoundedCornerShape(16.dp)
private val formaCampo = RoundedCornerShape(12.dp)

/** Barra azul de las pantallas autenticadas, igual a la de Billetera. */
@Composable
internal fun BarraSiniestros(
    titulo: String,
    onVolver: (() -> Unit)? = null,
    volverHabilitado: Boolean = true,
    acciones: @Composable RowScope.() -> Unit = {},
) {
    val colores = SolventaTema.colores
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colores.barra)
            .heightIn(min = 72.dp)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (onVolver != null) {
            IconButton(
                onClick = onVolver,
                enabled = volverHabilitado,
                modifier = Modifier.size(AREA_TACTIL).background(Color.White, CircleShape),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = stringResource(R.string.siniestros_volver),
                    tint = colores.barra,
                )
            }
        } else {
            Box(
                modifier = Modifier.size(40.dp).background(colores.marcaSuave, RoundedCornerShape(12.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.ReportProblem, contentDescription = null, tint = colores.marca)
            }
        }
        Text(
            titulo,
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            modifier = Modifier.weight(1f).semantics { heading() },
        )
        acciones()
    }
}

/** Superficie blanca con borde suave y sombra, como las tarjetas de Billetera. */
@Composable
internal fun Modifier.tarjetaSiniestro(): Modifier = this
    .shadow(2.dp, formaTarjeta, clip = false)
    .background(Color.White, formaTarjeta)
    .border(1.dp, SolventaTema.colores.campoBorde, formaTarjeta)
    .clip(formaTarjeta)

/** Tarjeta con título de sección en mayúsculas. */
@Composable
internal fun SeccionSiniestro(
    titulo: String,
    modifier: Modifier = Modifier,
    contenido: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier.fillMaxWidth().tarjetaSiniestro().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            titulo.uppercase(LocalConfiguration.current.locales[0]),
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = SolventaTema.colores.textoSecundario,
            modifier = Modifier.semantics { heading() },
        )
        contenido()
    }
}

/** Título y subtítulo de la pantalla, debajo de la barra. */
@Composable
internal fun EncabezadoSiniestros(titulo: String, subtitulo: String) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            titulo,
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = SolventaTema.colores.textoPrimario,
        )
        Text(subtitulo, style = MaterialTheme.typography.bodyMedium, color = SolventaTema.colores.textoSecundario)
    }
}

/** Selector segmentado de dos o más pestañas sobre el panel lavanda. */
@Composable
internal fun PestanasSiniestros(opciones: List<String>, seleccionada: Int, alSeleccionar: (Int) -> Unit) {
    val colores = SolventaTema.colores
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(colores.panel, formaCampo)
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        opciones.forEachIndexed { indice, texto ->
            val activa = indice == seleccionada
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (activa) Color.White else Color.Transparent)
                    .selectable(selected = activa, role = Role.Tab, onClick = { alSeleccionar(indice) }),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    texto,
                    style = MaterialTheme.typography.labelLarge,
                    fontWeight = if (activa) FontWeight.Bold else FontWeight.Medium,
                    color = if (activa) colores.barra else colores.textoSecundario,
                )
            }
        }
    }
}

/** Chip de estado: el texto lo identifica y el color solo refuerza. */
@Composable
internal fun ChipEstado(texto: String, tono: TonoEstado, modifier: Modifier = Modifier) {
    Text(
        texto,
        style = MaterialTheme.typography.labelMedium,
        fontWeight = FontWeight.Bold,
        color = tono.texto,
        modifier = modifier
            .background(tono.fondo, RoundedCornerShape(50))
            .padding(horizontal = 10.dp, vertical = 4.dp),
    )
}

internal enum class TonoEstado(val fondo: Color, val texto: Color) {
    INFORMATIVO(Color(0xFFE6EBFD), Color(0xFF2B44B8)),
    EN_CURSO(Color(0xFFFFF3D6), Color(0xFF8A5A00)),
    ALERTA(Color(0xFFFDEBDD), Color(0xFFB4531A)),
    EXITO(Color(0xFFE3F4EA), Color(0xFF1B6B3A)),
    ERROR(Color(0xFFFDE7E6), Color(0xFFB3261E)),
    NEUTRO(Color(0xFFF1ECFA), Color(0xFF5B4A8A)),
}

internal fun tonoEstadoReporte(estado: String): TonoEstado = when (estado) {
    "REPORTADO" -> TonoEstado.INFORMATIVO
    "EN_EVALUACION" -> TonoEstado.EN_CURSO
    "FALTA_SOPORTE" -> TonoEstado.ALERTA
    "APROBADO" -> TonoEstado.EXITO
    "RECHAZADO" -> TonoEstado.ERROR
    else -> TonoEstado.NEUTRO
}

/** Icono redondo sobre fondo suave, usado en tarjetas y pantallas informativas. */
@Composable
internal fun IconoCirculo(icono: ImageVector, tono: TonoEstado, tamano: Int = 40) {
    Box(
        modifier = Modifier.size(tamano.dp).background(tono.fondo, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icono, contentDescription = null, tint = tono.texto, modifier = Modifier.size((tamano / 2).dp))
    }
}

/** Fila etiqueta / valor para los datos de un reporte. */
@Composable
internal fun DatoSiniestro(etiqueta: String, valor: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(etiqueta, style = MaterialTheme.typography.labelMedium, color = SolventaTema.colores.textoSecundario)
        Text(
            valor,
            style = MaterialTheme.typography.bodyLarge,
            fontWeight = FontWeight.Medium,
            color = SolventaTema.colores.textoPrimario,
        )
    }
}

/** Campo de selección con etiqueta encima y aspecto de campo de texto. */
@Composable
internal fun CampoSelectorSiniestro(
    etiqueta: String,
    valor: String?,
    placeholder: String,
    habilitado: Boolean,
    alAbrir: () -> Unit,
    modifier: Modifier = Modifier,
    detalle: String? = null,
    menu: @Composable () -> Unit,
) {
    val colores = SolventaTema.colores
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(etiqueta, style = MaterialTheme.typography.labelLarge, color = colores.textoPrimario)
        Box {
            Row(
                modifier = modifier
                    .fillMaxWidth()
                    .heightIn(min = 56.dp)
                    .clip(formaCampo)
                    .background(if (habilitado) colores.campoFondo else colores.fondoPantalla)
                    .border(1.dp, colores.campoBorde, formaCampo)
                    .clickable(enabled = habilitado, role = Role.DropdownList, onClick = alAbrir)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(
                        valor ?: placeholder,
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (valor == null) colores.textoSecundario else colores.textoPrimario,
                    )
                    if (detalle != null) {
                        Text(detalle, style = MaterialTheme.typography.bodySmall, color = colores.textoSecundario)
                    }
                }
                Icon(Icons.Filled.ArrowDropDown, contentDescription = null, tint = colores.textoSecundario)
            }
            menu()
        }
    }
}

/** Botón principal verde de marca. */
@Composable
internal fun BotonPrincipal(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    habilitado: Boolean = true,
    icono: ImageVector? = null,
) {
    Button(
        onClick = onClick,
        enabled = habilitado,
        modifier = modifier.fillMaxWidth().heightIn(min = 52.dp),
        shape = formaCampo,
        colors = ButtonDefaults.buttonColors(
            containerColor = SolventaTema.colores.marca,
            contentColor = Color.White,
        ),
    ) {
        if (icono != null) {
            Icon(icono, contentDescription = null, modifier = Modifier.size(20.dp))
            Box(Modifier.size(8.dp))
        }
        Text(texto, fontWeight = FontWeight.Bold)
    }
}

/** Botón secundario con borde; [peligro] lo pinta en rojo para acciones destructivas. */
@Composable
internal fun BotonSecundario(
    texto: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    habilitado: Boolean = true,
    icono: ImageVector? = null,
    peligro: Boolean = false,
) {
    val colores = SolventaTema.colores
    val color = if (peligro) colores.advertencia else colores.marca
    OutlinedButton(
        onClick = onClick,
        enabled = habilitado,
        modifier = modifier.fillMaxWidth().heightIn(min = 48.dp),
        shape = formaCampo,
        border = BorderStroke(1.dp, if (habilitado) color else colores.campoBorde),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = color, containerColor = Color.White),
    ) {
        if (icono != null) {
            Icon(icono, contentDescription = null, modifier = Modifier.size(20.dp))
            Box(Modifier.size(8.dp))
        }
        Text(texto, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
    }
}

/** Aviso destacado: rojo para errores, verde para confirmaciones. */
@Composable
internal fun AvisoSiniestro(texto: String, modifier: Modifier = Modifier, exito: Boolean = false) {
    val tono = if (exito) TonoEstado.EXITO else TonoEstado.ERROR
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(tono.fondo, formaCampo)
            .padding(12.dp)
            .semantics { liveRegion = if (exito) LiveRegionMode.Polite else LiveRegionMode.Assertive },
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            if (exito) Icons.Filled.CheckCircle else Icons.Filled.ErrorOutline,
            contentDescription = null,
            tint = tono.texto,
        )
        Text(texto, style = MaterialTheme.typography.bodyMedium, color = tono.texto)
    }
}

/** Fecha ISO-8601 en formato legible del idioma del dispositivo; si no se puede leer, se muestra tal cual. */
@Composable
internal fun fechaLegible(iso: String, convertirAZonaLocal: Boolean = true): String {
    val idioma = LocalConfiguration.current.locales[0]
    return try {
        val fecha = OffsetDateTime.parse(iso)
        val formato = DateTimeFormatter.ofLocalizedDateTime(FormatStyle.MEDIUM, FormatStyle.SHORT).withLocale(idioma)
        if (convertirAZonaLocal) fecha.atZoneSameInstant(ZoneId.systemDefault()).format(formato) else fecha.format(formato)
    } catch (e: DateTimeParseException) {
        iso
    }
}
