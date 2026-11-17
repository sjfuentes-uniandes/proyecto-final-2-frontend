package com.solventa.feature.siniestros

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPoliza
import com.solventa.feature.siniestros.casos.AgregarEvidenciaAlBorrador
import com.solventa.feature.siniestros.casos.CrearBorradorSiniestro
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import kotlinx.coroutines.async
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.OffsetDateTime
import java.util.UUID

class SiniestrosViewModel(
    private val repositorio: RepositorioSiniestros,
    private val repositorioPolizas: RepositorioPolizas,
    private val almacen: AlmacenEvidencias,
    private val gestorSesion: GestorSesion,
    private val nuevaClave: () -> String = { UUID.randomUUID().toString() },
    private val ahora: () -> OffsetDateTime = OffsetDateTime::now,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SiniestrosUiState())
    val uiState: StateFlow<SiniestrosUiState> = _uiState.asStateFlow()

    private val _eventos = Channel<EventoSiniestros>(Channel.BUFFERED)
    val eventos = _eventos.receiveAsFlow()

    private var claveIdempotencia: String? = null
    private var cargaLista: kotlinx.coroutines.Job? = null

    init {
        cargar()
    }

    fun reintentarCarga() {
        if (cargaLista?.isActive == true) return
        cargar()
    }

    private fun cargar() {
        cargaLista = viewModelScope.launch {
            _uiState.update { it.copy(cargando = true, errorCarga = null) }
            val (limites, borradores, polizas) = coroutineScope {
                val limite = async { repositorio.limites() }
                val lista = async { repositorio.listar() }
                val listaPolizas = async { repositorioPolizas.listar() }
                Triple(
                    limite.await(),
                    lista.await(),
                    listaPolizas.await(),
                )
            }
            val fallos = listOf(limites, borradores).mapNotNull { it as? Resultado.Fallo }
            val error = fallos.firstOrNull()?.causa
            val valoresPoliza = when (polizas) {
                is ResultadoPoliza.Exito<*> -> (polizas.valor as? List<*>).orEmpty()
                    .filterIsInstance<PolizaResumen>()
                    .filter { it.estado == ESTADO_EMITIDA && it.vigente }
                is ResultadoPoliza.Fallo -> {
                    if (polizas.fallo == FalloPolizas.SesionInvalida) {
                        sesionInvalida()
                        return@launch
                    }
                    emptyList()
                }
            }
            if (error == FalloSiniestros.SesionVencida || error == FalloSiniestros.NoAutorizado) {
                sesionInvalida()
                return@launch
            }
            _uiState.update {
                it.copy(
                    cargando = false,
                    borradores = ((borradores as? Resultado.Exito<*>)?.valor as? List<*>)
                        .orEmpty()
                        .filterIsInstance<com.solventa.feature.siniestros.dominio.BorradorResumen>(),
                    polizasElegibles = valoresPoliza,
                    limites = (limites as? Resultado.Exito<*>)?.valor
                        as? com.solventa.feature.siniestros.dominio.LimitesSiniestros,
                    errorCarga = error ?: if (polizas is ResultadoPoliza.Fallo) FalloSiniestros.RespuestaInvalida else null,
                )
            }
        }
    }

    fun seleccionarPoliza(polizaId: String) {
        val valida = _uiState.value.polizasElegibles.any {
            it.polizaId == polizaId && it.estado == ESTADO_EMITIDA && it.vigente
        }
        if (valida) _uiState.update { it.copy(polizaSeleccionada = polizaId, falloFormulario = null) }
    }

    fun iniciarNuevoReporte() {
        if (_uiState.value.evidencias.isNotEmpty()) return
        claveIdempotencia = null
        _uiState.update {
            it.copy(
                polizaSeleccionada = null,
                descripcion = "",
                descripcionBloqueada = false,
                borradorActualId = null,
                falloFormulario = null,
                detalle = null,
            )
        }
    }

    fun eliminarArchivoTemporal(archivo: java.io.File) {
        almacen.eliminar(archivo)
    }

    fun cambiarDescripcion(texto: String) {
        if (_uiState.value.descripcionBloqueada) return
        if (texto.length <= MAX_CARACTERES_DESCRIPCION) {
            claveIdempotencia = null
            _uiState.update { it.copy(descripcion = texto, falloFormulario = null) }
        }
    }

    fun crearArchivoFoto() = almacen.crearArchivo(EXTENSION_FOTO)

    fun crearArchivoVideo() = almacen.crearArchivo(EXTENSION_VIDEO)

    fun agregarCaptura(archivo: java.io.File, tipo: TipoEvidencia, duracionSegundos: Int? = null) {
        val estado = _uiState.value
        val limites = estado.limites
        if (limites == null) {
            almacen.eliminar(archivo)
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.RespuestaInvalida) }
            return
        }
        if (estado.evidencias.size >= limites.maxEvidencias) {
            almacen.eliminar(archivo)
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.LimiteEvidenciasAlcanzado) }
            return
        }
        val esFoto = tipo == TipoEvidencia.FOTOGRAFIA
        val mime = if (esFoto) MIME_FOTO else MIME_VIDEO
        val formatos = if (esFoto) limites.formatosFoto else limites.formatosVideo
        val maximo = if (esFoto) limites.tamanoMaximoFotoBytes else limites.tamanoMaximoVideoBytes
        val fallo = when {
            !archivo.isFile || archivo.length() == 0L -> FalloSiniestros.ArchivoNoDisponible
            tipo == TipoEvidencia.DESCONOCIDO || mime !in formatos -> FalloSiniestros.EvidenciaNoAdmitida
            archivo.length() > maximo -> FalloSiniestros.TamanoEvidenciaExcedido
            !esFoto && duracionSegundos == null -> FalloSiniestros.EvidenciaNoAdmitida
            !esFoto && duracionSegundos !in 1..limites.duracionMaximaVideoSegundos ->
                FalloSiniestros.DuracionVideoExcedida
            else -> null
        }
        if (fallo != null) {
            almacen.eliminar(archivo)
            _uiState.update { it.copy(falloFormulario = fallo) }
            return
        }
        _uiState.update {
            it.copy(
                evidencias = it.evidencias + EvidenciaTemporal(
                    id = nuevaClave(),
                    archivo = archivo,
                    tipo = tipo,
                    capturadaEn = ahora().toString(),
                    duracionSegundos = duracionSegundos,
                ),
                falloFormulario = null,
            )
        }
    }

    fun eliminarCaptura(id: String) {
        val evidencia = _uiState.value.evidencias.firstOrNull { it.id == id } ?: return
        almacen.eliminar(evidencia.archivo)
        _uiState.update { it.copy(evidencias = it.evidencias.filterNot { archivo -> archivo.id == id }) }
    }

    fun cancelarFormulario() {
        _uiState.value.evidencias.forEach { almacen.eliminar(it.archivo) }
        claveIdempotencia = null
        _uiState.update {
            it.copy(
                polizaSeleccionada = null,
                descripcion = "",
                descripcionBloqueada = false,
                evidencias = emptyList(),
                borradorActualId = null,
                enviando = false,
                falloFormulario = null,
            )
        }
        reintentarCarga()
    }

    fun reportar() {
        val actual = _uiState.value
        if (actual.enviando) return
        val polizaId = actual.polizaSeleccionada
        if (polizaId == null || actual.polizasElegibles.none { it.polizaId == polizaId }) {
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.PolizaNoEncontrada) }
            return
        }
        val descripcion = actual.descripcion.trim()
        if (descripcion.isEmpty()) {
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.DescripcionObligatoria) }
            return
        }
        if (descripcion.length > MAX_CARACTERES_DESCRIPCION) {
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.DescripcionDemasiadoLarga) }
            return
        }
        val limites = actual.limites
        if (limites == null) {
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.RespuestaInvalida) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(enviando = true, descripcionBloqueada = true, falloFormulario = null) }
            var borradorId = _uiState.value.borradorActualId
            if (borradorId == null) {
                val clave = claveIdempotencia ?: nuevaClave().also { claveIdempotencia = it }
                val crearBorrador = CrearBorradorSiniestro(repositorio)
                when (val creado = crearBorrador(polizaId, descripcion, clave)) {
                    is Resultado.Fallo -> {
                        reportarFallo(creado.causa)
                        return@launch
                    }
                    is Resultado.Exito -> {
                        borradorId = creado.valor.id
                        _uiState.update { it.copy(borradorActualId = creado.valor.id) }
                    }
                }
            }

            val agregarEvidencia = AgregarEvidenciaAlBorrador(repositorio)
            for (evidencia in _uiState.value.evidencias) {
                when (val resultado = agregarEvidencia(borradorId, evidencia, limites)) {
                    is Resultado.Fallo -> {
                        reportarFallo(resultado.causa)
                        return@launch
                    }
                    is Resultado.Exito -> {
                        almacen.eliminar(evidencia.archivo)
                        _uiState.update {
                            it.copy(evidencias = it.evidencias.filterNot { temporal -> temporal.id == evidencia.id })
                        }
                    }
                }
            }
            _uiState.update { it.copy(enviando = false) }
            _eventos.send(EventoSiniestros.AbrirDetalle(borradorId))
        }
    }

    private fun reportarFallo(fallo: FalloSiniestros) {
        _uiState.update { it.copy(enviando = false, falloFormulario = fallo) }
        if (fallo == FalloSiniestros.SesionVencida || fallo == FalloSiniestros.NoAutorizado) {
            viewModelScope.launch { sesionInvalida() }
        }
    }

    fun consultarDetalle(borradorId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(cargandoDetalle = true, detalle = null, falloFormulario = null) }
            when (val resultado = repositorio.detalle(borradorId)) {
                is Resultado.Exito -> _uiState.update {
                    it.copy(cargandoDetalle = false, detalle = resultado.valor)
                }
                is Resultado.Fallo -> {
                    _uiState.update { it.copy(cargandoDetalle = false, falloFormulario = resultado.causa) }
                    if (resultado.causa == FalloSiniestros.SesionVencida) sesionInvalida()
                }
            }
        }
    }

    fun refrescarLista() {
        reintentarCarga()
    }

    private suspend fun sesionInvalida() {
        gestorSesion.cerrarSesion()
        _eventos.send(EventoSiniestros.IrALogin)
    }

    private companion object {
        const val ESTADO_EMITIDA = "EMITIDA"
        const val MAX_CARACTERES_DESCRIPCION = 2000
        const val EXTENSION_FOTO = "jpg"
        const val EXTENSION_VIDEO = "mp4"
        const val MIME_FOTO = "image/jpeg"
        const val MIME_VIDEO = "video/mp4"
    }
}
