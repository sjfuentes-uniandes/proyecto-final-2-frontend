package com.solventa.feature.siniestros

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.solventa.core.auth.GestorSesion
import com.solventa.feature.billetera.dominio.FalloPolizas
import com.solventa.feature.billetera.dominio.PolizaResumen
import com.solventa.feature.billetera.dominio.Vigencia
import com.solventa.feature.billetera.dominio.RepositorioPolizas
import com.solventa.feature.billetera.dominio.Resultado as ResultadoPoliza
import com.solventa.feature.siniestros.casos.AgregarEvidenciaAlBorrador
import com.solventa.feature.siniestros.casos.CrearBorradorSiniestro
import com.solventa.feature.siniestros.dominio.AlmacenEvidencias
import com.solventa.feature.siniestros.dominio.AlmacenPendientes
import com.solventa.feature.siniestros.dominio.PendienteLocal
import com.solventa.feature.siniestros.dominio.BorradorDetalle
import com.solventa.feature.siniestros.dominio.EvidenciaTemporal
import com.solventa.feature.siniestros.dominio.FalloSiniestros
import com.solventa.feature.siniestros.dominio.ImportadorEvidencias
import com.solventa.feature.siniestros.dominio.RepositorioSiniestros
import com.solventa.feature.siniestros.dominio.Resultado
import com.solventa.feature.siniestros.dominio.TipoEvidencia
import com.solventa.feature.siniestros.dominio.EstadoCarga
import com.solventa.feature.siniestros.dominio.EnvioSiniestro
import com.solventa.feature.siniestros.dominio.ProveedorUbicacion
import com.solventa.feature.siniestros.dominio.PermisoUbicacion
import com.solventa.feature.siniestros.dominio.UbicacionCapturada
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeParseException
import java.time.format.DateTimeFormatter
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
    private val proveedorUbicacion: ProveedorUbicacion? = null,
    private val importadorEvidencias: ImportadorEvidencias? = null,
    private val almacenPendientes: AlmacenPendientes,
) : ViewModel() {
    private val _uiState = MutableStateFlow(SiniestrosUiState())
    val uiState: StateFlow<SiniestrosUiState> = _uiState.asStateFlow()

    private val _eventos = Channel<EventoSiniestros>(Channel.BUFFERED)
    val eventos = _eventos.receiveAsFlow()

    private var claveIdempotencia: String? = null
    private var cargaLista: kotlinx.coroutines.Job? = null
    private var cargaCoberturas: kotlinx.coroutines.Job? = null
    private var cargaReporte: kotlinx.coroutines.Job? = null
    private var descargaEvidencia: kotlinx.coroutines.Job? = null
    private var capturaUbicacion: kotlinx.coroutines.Job? = null

    init {
        cargar()
    }

    fun reintentarCarga() {
        if (cargaLista?.isActive == true) return
        cargar()
    }

    private fun cargar() {
        cargarHistorial()
        cargaLista = viewModelScope.launch {
            _uiState.update { it.copy(cargando = true, errorCarga = null) }
            val (limites, borradores, polizas, locales) = coroutineScope {
                val limite = async { repositorio.limites() }
                val lista = async { repositorio.listar() }
                val listaPolizas = async { repositorioPolizas.listar() }
                val listaLocal = async { almacenPendientes.listar() }
                DatosCarga(
                    limite.await(),
                    lista.await(),
                    listaPolizas.await(),
                    listaLocal.await(),
                )
            }
            val fallos = listOf(limites, borradores).mapNotNull { it as? Resultado.Fallo }
            val error = fallos.firstOrNull()?.causa
            var errorValidacionPolizas = false
            val valoresPoliza = when (polizas) {
                is ResultadoPoliza.Exito -> filtrarPolizasElegibles(polizas.valor).mapNotNull { poliza ->
                    when (val respuesta = repositorioPolizas.detalle(poliza.polizaId)) {
                        is ResultadoPoliza.Exito -> {
                            val detalle = respuesta.valor
                            poliza.copy(
                                estado = detalle.estado,
                                vigente = detalle.vigente,
                                vigencia = Vigencia(
                                    maxOf(poliza.vigencia.desde, detalle.vigencia.desde),
                                    minOf(poliza.vigencia.hasta, detalle.vigencia.hasta),
                                ),
                            ).takeIf { it.esElegible(hoyEnColombia()) }
                        }
                        is ResultadoPoliza.Fallo -> {
                            if (respuesta.fallo == FalloPolizas.SesionInvalida) {
                                sesionInvalida()
                                return@launch
                            }
                            errorValidacionPolizas = true
                            null
                        }
                    }
                }
                is ResultadoPoliza.Fallo -> {
                    if (polizas.fallo == FalloPolizas.SesionInvalida) {
                        sesionInvalida()
                        return@launch
                    }
                    errorValidacionPolizas = true
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
                    errorValidacionPolizas = errorValidacionPolizas,
                    limites = (limites as? Resultado.Exito<*>)?.valor
                        as? com.solventa.feature.siniestros.dominio.LimitesSiniestros,
                    errorCarga = error ?: if (polizas is ResultadoPoliza.Fallo) FalloSiniestros.RespuestaInvalida else null,
                    pendientesLocales = (locales as? Resultado.Exito)?.valor ?: it.pendientesLocales,
                    errorPendientesLocales = (locales as? Resultado.Fallo)?.causa,
                )
            }
        }
    }

    fun seleccionarPoliza(polizaId: String) {
        val actual = _uiState.value
        if (actual.cargando || actual.enviando || actual.descripcionBloqueada || actual.borradorActualId != null) return
        val elegibles = filtrarPolizasElegibles(actual.polizasElegibles)
        if (elegibles.none { it.polizaId == polizaId }) {
            _uiState.update { it.copy(polizasElegibles = elegibles, falloFormulario = FalloSiniestros.PolizaNoVigente) }
            return
        }
        _uiState.update {
            it.copy(polizasElegibles = elegibles, polizaSeleccionada = polizaId, causa = null, falloFormulario = null)
        }
        cargarCoberturas()
    }

    private fun filtrarPolizasElegibles(polizas: List<PolizaResumen>): List<PolizaResumen> {
        val hoy = hoyEnColombia()
        return polizas.filter { it.esElegible(hoy) }
    }

    private fun hoyEnColombia(): LocalDate = ahora().atZoneSameInstant(ZONA_COLOMBIA).toLocalDate()

    private fun PolizaResumen.esElegible(hoy: LocalDate): Boolean =
        esElegible(estado, vigente, vigencia, hoy)

    private fun esElegible(estado: String, vigente: Boolean, vigencia: Vigencia, hoy: LocalDate): Boolean =
        estado == ESTADO_ACTIVA && vigente && hoy in vigencia.desde..vigencia.hasta

    fun iniciarNuevoReporte() {
        if (_uiState.value.enviando || _uiState.value.evidencias.isNotEmpty() || claveIdempotencia != null) return
        claveIdempotencia = null
        val fechaInicial = ahora().format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        _uiState.update {
            it.copy(
                polizasElegibles = filtrarPolizasElegibles(it.polizasElegibles),
                polizaSeleccionada = null,
                descripcion = "",
                descripcionBloqueada = false,
                borradorActualId = null,
                falloFormulario = null,
                detalle = null,
                causa = null,
                fechaEvento = fechaInicial,
                ubicacion = null, ubicacionPendiente = null, falloUbicacion = null,
                motivoSinUbicacion = null, borradorGuardado = false,
                coberturas = emptyList(),
                vigenciaEvento = null,
                errorCoberturas = null,
                envioConfirmado = null,
                pendienteLocalId = null, pendienteGuardadoLocal = false,
            )
        }
    }

    fun cargarCoberturas() {
        val polizaId = _uiState.value.polizaSeleccionada ?: return
        cargaCoberturas?.cancel()
        cargaCoberturas = viewModelScope.launch {
            _uiState.update { it.copy(cargandoCoberturas = true, coberturas = emptyList(), vigenciaEvento = null, errorCoberturas = null) }
            when (val respuesta = repositorioPolizas.detalle(polizaId)) {
                is ResultadoPoliza.Exito -> {
                    val poliza = respuesta.valor
                    _uiState.update {
                        when {
                            it.polizaSeleccionada != polizaId -> it.copy(cargandoCoberturas = false)
                            it.borradorActualId == null && !esElegible(poliza.estado, poliza.vigente, poliza.vigencia, hoyEnColombia()) ->
                                it.copy(
                                    cargandoCoberturas = false,
                                    polizasElegibles = it.polizasElegibles.filterNot { opcion -> opcion.polizaId == polizaId },
                                    polizaSeleccionada = null,
                                    causa = null,
                                    falloFormulario = FalloSiniestros.PolizaNoVigente,
                                )
                            else -> it.copy(cargandoCoberturas = false, coberturas = poliza.coberturas, vigenciaEvento = poliza.vigencia)
                        }
                    }
                }
                is ResultadoPoliza.Fallo -> {
                    val fallo = when (respuesta.fallo) {
                        FalloPolizas.SesionInvalida -> FalloSiniestros.SesionVencida
                        FalloPolizas.SinConexion -> FalloSiniestros.SinConexion
                        FalloPolizas.ServicioNoDisponible -> FalloSiniestros.ServicioNoDisponible
                        FalloPolizas.NoAutorizada -> FalloSiniestros.PolizaNoAutorizada
                        FalloPolizas.NoEncontrada -> FalloSiniestros.PolizaNoEncontrada
                        FalloPolizas.ErrorGenerico -> FalloSiniestros.RespuestaInvalida
                    }
                    _uiState.update { it.copy(cargandoCoberturas = false, errorCoberturas = fallo) }
                    if (fallo == FalloSiniestros.SesionVencida) sesionInvalida()
                }
            }
        }
    }

    fun seleccionarCausa(codigo: String) {
        if (!_uiState.value.enviando && _uiState.value.coberturas.any { it.codigo == codigo }) {
            _uiState.update { it.copy(causa = codigo, falloFormulario = null) }
        }
    }

    fun cambiarFechaEvento(fecha: String) {
        if (!_uiState.value.enviando) _uiState.update { it.copy(fechaEvento = fecha, falloFormulario = null) }
    }

    fun eliminarArchivoTemporal(archivo: java.io.File) {
        almacen.eliminar(archivo)
    }

    fun cambiarDescripcion(texto: String) {
        if (_uiState.value.descripcionBloqueada || _uiState.value.enviando) return
        if (texto.length <= MAX_CARACTERES_DESCRIPCION) {
            claveIdempotencia = null
            _uiState.update { it.copy(descripcion = texto, falloFormulario = null) }
        }
    }

    fun crearArchivoFoto() = almacen.crearArchivo(EXTENSION_FOTO)

    fun crearArchivoVideo() = almacen.crearArchivo(EXTENSION_VIDEO)

    fun prepararSeleccionArchivo(): Boolean {
        val estado = _uiState.value
        if (estado.enviando || estado.importandoEvidencia) return false
        val limites = estado.limites
        if (limites == null || importadorEvidencias == null) {
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.RespuestaInvalida) }
            return false
        }
        val existentes = estado.detalle?.takeIf { it.id == estado.borradorActualId }?.cantidadEvidencias ?: 0
        if (existentes + estado.evidencias.size >= limites.maxEvidencias) {
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.LimiteEvidenciasAlcanzado) }
            return false
        }
        return true
    }

    fun falloSelectorArchivo() {
        _uiState.update { it.copy(falloFormulario = FalloSiniestros.ArchivoNoDisponible) }
    }

    fun adjuntarArchivo(uri: String) {
        if (!prepararSeleccionArchivo()) return
        val limites = _uiState.value.limites ?: return
        val importador = importadorEvidencias ?: return
        _uiState.update { it.copy(importandoEvidencia = true, falloFormulario = null) }
        viewModelScope.launch {
            try {
                when (val resultado = importador.importar(uri, limites)) {
                    is Resultado.Fallo -> _uiState.update { it.copy(falloFormulario = resultado.causa) }
                    is Resultado.Exito -> {
                        val archivo = resultado.valor
                        _uiState.update {
                            it.copy(
                                evidencias = it.evidencias + EvidenciaTemporal(
                                    id = nuevaClave(), archivo = archivo.archivo, tipo = archivo.tipo,
                                    capturadaEn = null, duracionSegundos = archivo.duracionSegundos,
                                    tipoContenido = archivo.tipoContenido, nombreArchivo = archivo.nombreArchivo,
                                ),
                                falloFormulario = null,
                            )
                        }
                    }
                }
            } finally {
                _uiState.update { it.copy(importandoEvidencia = false) }
            }
        }
    }

    fun agregarCaptura(archivo: java.io.File, tipo: TipoEvidencia, duracionSegundos: Int? = null) {
        if (_uiState.value.enviando || _uiState.value.importandoEvidencia) {
            almacen.eliminar(archivo)
            return
        }
        val estado = _uiState.value
        val limites = estado.limites
        if (limites == null) {
            almacen.eliminar(archivo)
            _uiState.update { it.copy(falloFormulario = FalloSiniestros.RespuestaInvalida) }
            return
        }
        val existentes = if (estado.borradorActualId != null) estado.detalle?.cantidadEvidencias ?: 0 else 0
        if (existentes + estado.evidencias.size >= limites.maxEvidencias) {
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
        if (_uiState.value.enviando || _uiState.value.importandoEvidencia) return
        val evidencia = _uiState.value.evidencias.firstOrNull { it.id == id } ?: return
        almacen.eliminar(evidencia.archivo)
        _uiState.update { it.copy(evidencias = it.evidencias.filterNot { archivo -> archivo.id == id }) }
    }

    fun prepararAdjuntarEvidencia(borradorId: String): Boolean {
        val estado = _uiState.value
        val detalle = estado.detalle?.takeIf { it.id == borradorId } ?: return false
        if (estado.enviando || detalle.estado != ESTADO_BORRADOR_ABIERTO) return false

        _uiState.update {
            it.copy(
                polizaSeleccionada = detalle.polizaId,
                descripcion = detalle.descripcion,
                descripcionBloqueada = false,
                evidencias = if (estado.borradorActualId == detalle.id) estado.evidencias else emptyList(),
                borradorActualId = detalle.id,
                enviando = false,
                falloFormulario = null,
                causa = detalle.causa,
                fechaEvento = detalle.fechaEvento.orEmpty(),
                ubicacion = detalle.ubicacion, ubicacionPendiente = null, falloUbicacion = null, borradorGuardado = false,
                envioConfirmado = null,
            )
        }
        cargarCoberturas()
        comprobarPermisoUbicacion()
        return true
    }

    fun cancelarAdjuntarEvidencia() {
        if (_uiState.value.enviando || _uiState.value.importandoEvidencia) return
        cancelarCapturaUbicacion()
        val estado = _uiState.value
        estado.evidencias.forEach { almacen.eliminar(it.archivo) }
        _uiState.update {
            it.copy(
                polizaSeleccionada = null,
                descripcion = "",
                descripcionBloqueada = false,
                evidencias = emptyList(),
                borradorActualId = null,
                enviando = false,
                falloFormulario = null,
                pendienteLocalId = null, pendienteGuardadoLocal = false,
            )
        }
    }

    fun cancelarFormulario() {
        if (_uiState.value.enviando || _uiState.value.importandoEvidencia) return
        cancelarCapturaUbicacion()
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
                pendienteLocalId = null, pendienteGuardadoLocal = false,
            )
        }
        reintentarCarga()
    }

    fun reportar() = procesarFormulario(enviar = true)

    fun guardarBorrador() = procesarFormulario(enviar = false)

    fun abrirPendienteLocal(id: String) {
        if (_uiState.value.enviando || _uiState.value.importandoEvidencia || _uiState.value.cargandoDetalle) return
        _uiState.update { it.copy(cargandoDetalle = true, errorPendientesLocales = null) }
        viewModelScope.launch {
            when (val respuesta = almacenPendientes.abrir(id)) {
                is Resultado.Fallo -> _uiState.update {
                    it.copy(cargandoDetalle = false, errorPendientesLocales = respuesta.causa)
                }
                is Resultado.Exito -> {
                    val pendiente = respuesta.valor
                    claveIdempotencia = pendiente.claveCreacion
                    _uiState.update {
                        it.copy(
                            cargandoDetalle = false, polizaSeleccionada = pendiente.polizaId,
                            descripcion = pendiente.descripcion, causa = pendiente.causa,
                            fechaEvento = pendiente.fechaEvento, evidencias = pendiente.evidencias,
                            borradorActualId = pendiente.borradorId, detalle = null,
                            descripcionBloqueada = pendiente.borradorId == null,
                            ubicacion = pendiente.ubicacion, ubicacionPendiente = pendiente.ubicacionPendiente,
                            pendienteLocalId = pendiente.id, pendienteGuardadoLocal = true,
                            falloFormulario = null, falloUbicacion = null, envioConfirmado = null,
                        )
                    }
                    cargarCoberturas()
                    comprobarPermisoUbicacion()
                    _eventos.send(EventoSiniestros.AbrirPendienteLocal)
                    pendiente.borradorId?.let(::consultarDetalle)
                }
            }
        }
    }

    suspend fun descartarPendienteLocal(): Boolean {
        val actual = _uiState.value
        if (actual.enviando || actual.importandoEvidencia) return false
        val id = actual.pendienteLocalId ?: return true
        _uiState.update { it.copy(enviando = true) }
        try {
            return when (val resultado = almacenPendientes.eliminar(id)) {
                is Resultado.Exito -> {
                    _uiState.update { it.copy(pendienteLocalId = null, pendienteGuardadoLocal = false) }
                    true
                }
                is Resultado.Fallo -> {
                    _uiState.update { it.copy(falloFormulario = resultado.causa) }
                    false
                }
            }
        } finally {
            _uiState.update { it.copy(enviando = false) }
        }
    }

    private suspend fun guardarCopiaLocal(): Boolean {
        val actual = _uiState.value
        val poliza = actual.polizaSeleccionada
        if (poliza == null) {
            reportarFallo(FalloSiniestros.PolizaNoEncontrada)
            return false
        }
        val id = actual.pendienteLocalId ?: UUID.randomUUID().toString()
        val clave = claveIdempotencia ?: nuevaClave().also { claveIdempotencia = it }
        val pendiente = PendienteLocal(
            id, poliza, actual.descripcion.trim(), actual.causa, actual.fechaEvento, actual.borradorActualId,
            clave, actual.evidencias, actual.ubicacion, actual.ubicacionPendiente,
        )
        return when (val guardado = almacenPendientes.guardar(pendiente)) {
            is Resultado.Fallo -> {
                reportarFallo(guardado.causa)
                false
            }
            is Resultado.Exito -> {
                _uiState.update { it.copy(pendienteLocalId = id, pendienteGuardadoLocal = true) }
                true
            }
        }
    }

    private suspend fun asegurarBorrador(): String? {
        val actual = _uiState.value
        actual.borradorActualId?.let { return it }
        val poliza = actual.polizasElegibles.firstOrNull { it.polizaId == actual.polizaSeleccionada }
        if (poliza == null || !poliza.esElegible(hoyEnColombia())) {
            reportarFallo(FalloSiniestros.PolizaNoVigente)
            return null
        }
        val descripcion = actual.descripcion.trim()
        if (descripcion.isEmpty() || descripcion.length > MAX_CARACTERES_DESCRIPCION) {
            reportarFallo(if (descripcion.isEmpty()) FalloSiniestros.DescripcionObligatoria else FalloSiniestros.DescripcionDemasiadoLarga)
            return null
        }
        val clave = claveIdempotencia ?: nuevaClave().also { claveIdempotencia = it }
        _uiState.update { it.copy(descripcionBloqueada = true) }
        return when (val creado = CrearBorradorSiniestro(repositorio)(poliza.polizaId, descripcion, clave)) {
            is Resultado.Exito -> {
                _uiState.update { it.copy(borradorActualId = creado.valor.id, descripcionBloqueada = false) }
                creado.valor.id
            }
            is Resultado.Fallo -> {
                if (!creado.causa.reintentable) {
                    claveIdempotencia = null
                    _uiState.update { it.copy(descripcionBloqueada = false) }
                }
                reportarFallo(creado.causa)
                null
            }
        }
    }

    fun iniciarUbicacion() {
        val actual = _uiState.value
        if (actual.enviando || actual.importandoEvidencia || actual.guardandoUbicacion || actual.obteniendoUbicacion) return
        if (actual.limites?.reglasUbicacion == null) {
            _uiState.update { it.copy(falloUbicacion = FalloSiniestros.RespuestaInvalida) }
            return
        }
        _uiState.update { it.copy(guardandoUbicacion = true, falloUbicacion = null) }
        capturaUbicacion = viewModelScope.launch {
            try {
                if (asegurarBorrador() != null) _eventos.send(EventoSiniestros.SolicitarUbicacion)
            } finally { _uiState.update { it.copy(guardandoUbicacion = false) } }
        }
    }

    fun respuestaPermisoUbicacion(permanente: Boolean) {
        proveedorUbicacion?.registrarRespuesta(permanente)
        capturarUbicacion()
    }

    fun permisoUbicacionActual() = proveedorUbicacion?.permisoActual() ?: PermisoUbicacion.NO_SOLICITADO

    fun comprobarPermisoUbicacion(guardar: Boolean = true) {
        val proveedor = proveedorUbicacion ?: return
        val actual = _uiState.value
        val lectura = actual.ubicacionPendiente ?: actual.ubicacion?.lectura ?: return
        val permiso = proveedor.permisoActual()
        if (permiso == lectura.permiso) return
        _uiState.update {
            it.copy(ubicacion = null, ubicacionPendiente = UbicacionCapturada(permiso), borradorGuardado = false)
        }
        if (guardar && actual.borradorActualId != null && !actual.enviando && !actual.guardandoUbicacion) reintentarGuardarUbicacion()
    }

    fun capturarUbicacion() {
        val actual = _uiState.value
        if (actual.enviando || actual.importandoEvidencia || actual.obteniendoUbicacion || actual.guardandoUbicacion || actual.borradorActualId == null) return
        val proveedor = proveedorUbicacion
        if (proveedor == null) {
            _uiState.update { it.copy(falloUbicacion = FalloSiniestros.RespuestaInvalida) }
            return
        }
        _uiState.update { it.copy(obteniendoUbicacion = true, falloUbicacion = null, motivoSinUbicacion = null) }
        capturaUbicacion = viewModelScope.launch {
            try {
                val captura = proveedor.capturar()
                val permiso = proveedor.permisoActual()
                val lectura = if (captura.lectura.permiso == permiso) captura.lectura else UbicacionCapturada(permiso)
                if (!lectura.esValida()) {
                    _uiState.update { it.copy(falloUbicacion = FalloSiniestros.UbicacionInvalida) }
                    return@launch
                }
                _uiState.update {
                    it.copy(ubicacion = null, ubicacionPendiente = lectura, motivoSinUbicacion = captura.motivo, borradorGuardado = false)
                }
                guardarUbicacionPendiente()
            } finally { _uiState.update { it.copy(obteniendoUbicacion = false) } }
        }
    }

    fun cancelarCapturaUbicacion() {
        capturaUbicacion?.cancel()
    }

    fun reintentarGuardarUbicacion() {
        if (_uiState.value.guardandoUbicacion || _uiState.value.enviando ||
            _uiState.value.importandoEvidencia || _uiState.value.obteniendoUbicacion
        ) return
        viewModelScope.launch { guardarUbicacionPendiente() }
    }

    private suspend fun guardarUbicacionPendiente(): Boolean {
        comprobarPermisoUbicacion(guardar = false)
        val actual = _uiState.value
        val ubicacion = actual.ubicacionPendiente ?: return true
        val id = actual.borradorActualId ?: return false
        _uiState.update { it.copy(guardandoUbicacion = true, falloUbicacion = null) }
        try {
            return when (val respuesta = repositorio.guardarUbicacion(id, ubicacion)) {
                is Resultado.Exito -> {
                    if (recuperarConvertido(respuesta.valor)) return false
                    if (respuesta.valor.ubicacion == null) {
                        _uiState.update { it.copy(falloUbicacion = FalloSiniestros.RespuestaInvalida) }
                        false
                    } else {
                        _uiState.update {
                            if (it.ubicacionPendiente == ubicacion) it.copy(
                                detalle = respuesta.valor, ubicacion = respuesta.valor.ubicacion, ubicacionPendiente = null,
                            ) else it.copy(detalle = respuesta.valor)
                        }
                        comprobarPermisoUbicacion(guardar = false)
                        _uiState.value.ubicacionPendiente == null
                    }
                }
                is Resultado.Fallo -> {
                    _uiState.update { it.copy(falloUbicacion = respuesta.causa) }
                    if (respuesta.causa == FalloSiniestros.SesionVencida) sesionInvalida()
                    if (respuesta.causa == FalloSiniestros.BorradorConvertido) {
                        when (val detalle = repositorio.detalle(id)) {
                            is Resultado.Exito -> recuperarConvertido(detalle.valor)
                            is Resultado.Fallo -> _uiState.update { it.copy(falloUbicacion = detalle.causa) }
                        }
                    }
                    false
                }
            }
        } finally { _uiState.update { it.copy(guardandoUbicacion = false) } }
    }

    private fun procesarFormulario(enviar: Boolean) {
        val actual = _uiState.value
        if (actual.enviando || actual.importandoEvidencia || actual.guardandoUbicacion || actual.obteniendoUbicacion || actual.envioConfirmado != null) return
        val fallo = validarFormulario(actual, enviar)
        if (fallo != null) {
            reportarFallo(fallo)
            return
        }
        _uiState.update { it.copy(enviando = true, falloFormulario = null, borradorGuardado = false) }
        viewModelScope.launch {
            if (!guardarCopiaLocal()) return@launch
            actual.borradorActualId?.let { id ->
                when (val respuesta = repositorio.detalle(id)) {
                    is Resultado.Fallo -> {
                        reportarFallo(respuesta.causa)
                        return@launch
                    }
                    is Resultado.Exito -> {
                        _uiState.update { it.copy(detalle = respuesta.valor) }
                        if (recuperarConvertido(respuesta.valor)) return@launch
                    }
                }
            }
            enviarFormulario(enviar)
        }
    }

    private fun validarFormulario(actual: SiniestrosUiState, enviar: Boolean): FalloSiniestros? {
        val polizaId = actual.polizaSeleccionada
        if (actual.borradorActualId == null) {
            val poliza = actual.polizasElegibles.firstOrNull { it.polizaId == polizaId }
            if (poliza == null) {
                return FalloSiniestros.PolizaNoEncontrada
            }
            val hoy = hoyEnColombia()
            val vigenciaDetalle = actual.vigenciaEvento
            if (!poliza.esElegible(hoy) || (vigenciaDetalle != null && hoy !in vigenciaDetalle.desde..vigenciaDetalle.hasta)) {
                return FalloSiniestros.PolizaNoVigente
            }
        }
        val descripcion = actual.descripcion.trim()
        if (descripcion.isEmpty()) {
            return FalloSiniestros.DescripcionObligatoria
        }
        if (descripcion.length > MAX_CARACTERES_DESCRIPCION) {
            return FalloSiniestros.DescripcionDemasiadoLarga
        }
        if (actual.limites == null) return FalloSiniestros.RespuestaInvalida
        val causa = actual.causa
        if (enviar && (actual.errorCoberturas != null || actual.cargandoCoberturas)) {
            return actual.errorCoberturas ?: FalloSiniestros.RespuestaInvalida
        }
        if (enviar && (causa == null || actual.coberturas.none { it.codigo == causa })) {
            return FalloSiniestros.CausaObligatoria
        }
        val fecha = try {
            OffsetDateTime.parse(actual.fechaEvento.trim())
        } catch (_: DateTimeParseException) {
            null
        }
        val vigencia = actual.vigenciaEvento
        val fechaBogota = fecha?.atZoneSameInstant(ZONA_COLOMBIA)?.toLocalDate()
        if ((enviar || actual.fechaEvento.isNotBlank()) && (fecha == null || fecha.isAfter(ahora()) ||
            vigencia == null || fechaBogota == null || fechaBogota < vigencia.desde || fechaBogota > vigencia.hasta)
        ) {
            return FalloSiniestros.FechaEventoInvalida
        }
        if (enviar && actual.evidencias.isEmpty() && (actual.detalle?.cantidadEvidencias ?: 0) == 0) {
            return FalloSiniestros.EvidenciaObligatoria
        }
        return null
    }

    private suspend fun enviarFormulario(enviar: Boolean) {
        val actual = _uiState.value
        val descripcion = actual.descripcion.trim()
        val limites = actual.limites ?: return reportarFallo(FalloSiniestros.RespuestaInvalida)
        val causa = actual.causa
        val fecha = try {
            OffsetDateTime.parse(actual.fechaEvento.trim())
        } catch (_: DateTimeParseException) {
            null
        }
        val idBorrador = asegurarBorrador() ?: return
        val fechaGuardada = fecha?.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
        val actualizacion = if (enviar && causa != null && fechaGuardada != null) {
            repositorio.actualizar(idBorrador, descripcion, causa, fechaGuardada)
        } else {
            repositorio.guardarDatos(idBorrador, descripcion, causa, fechaGuardada)
        }
        when (val actualizado = actualizacion) {
            is Resultado.Fallo -> {
                gestionarFalloEnvio(idBorrador, actualizado.causa)
                return
            }
            is Resultado.Exito -> {
                _uiState.update { it.copy(detalle = actualizado.valor) }
                if (recuperarConvertido(actualizado.valor)) return
            }
        }
        comprobarPermisoUbicacion(guardar = false)
        val ubicacionGuardada = guardarUbicacionPendiente()
        if (_uiState.value.envioConfirmado != null) return
        if (!ubicacionGuardada && enviar) {
            _uiState.update { it.copy(enviando = false) }
            return
        }
        val agregarEvidencia = AgregarEvidenciaAlBorrador(repositorio)
        for (evidencia in _uiState.value.evidencias) {
            when (val resultado = agregarEvidencia(idBorrador, evidencia, limites)) {
                is Resultado.Fallo -> {
                    gestionarFalloEnvio(idBorrador, resultado.causa)
                    return
                }
                is Resultado.Exito -> {
                    almacen.eliminar(evidencia.archivo)
                    _uiState.update {
                        it.copy(evidencias = it.evidencias.filterNot { temporal -> temporal.id == evidencia.id })
                    }
                }
            }
        }
        when (val detalle = repositorio.detalle(idBorrador)) {
            is Resultado.Fallo -> {
                reportarFallo(detalle.causa)
                return
            }
            is Resultado.Exito -> {
                _uiState.update { it.copy(detalle = detalle.valor) }
                if (recuperarConvertido(detalle.valor)) return
                _uiState.update {
                    if (it.ubicacionPendiente == null) it.copy(ubicacion = detalle.valor.ubicacion) else it
                }
                if (!enviar) {
                    if (_uiState.value.ubicacionPendiente == null) eliminarCopiaLocal()
                    _uiState.update { it.copy(enviando = false, borradorGuardado = it.ubicacionPendiente == null) }
                    return
                }
                if (detalle.valor.evidencias.isEmpty()) {
                    reportarFallo(FalloSiniestros.EvidenciaObligatoria)
                    return
                }
                comprobarPermisoUbicacion(guardar = false)
                if (!_uiState.value.puedeEnviarPorUbicacion()) {
                    _uiState.update { it.copy(enviando = false, falloUbicacion = FalloSiniestros.UbicacionInvalida) }
                    return
                }
                if (detalle.valor.evidenciasPendientes > 0 ||
                    detalle.valor.evidencias.any { it.estadoCarga != EstadoCarga.CARGADA }
                ) {
                    reportarFallo(FalloSiniestros.EvidenciaNoCargada)
                    return
                }
            }
        }
        // Una operacion por borrador: la misma UUID incluso despues de reiniciar la app.
        val claveEnvio = UUID.nameUUIDFromBytes("solventa:siniestro:envio:$idBorrador".toByteArray(Charsets.UTF_8)).toString()
        when (val enviado = repositorio.enviar(idBorrador, claveEnvio)) {
            is Resultado.Exito -> confirmarEnvio(enviado.valor)
            is Resultado.Fallo -> gestionarFalloEnvio(idBorrador, enviado.causa)
        }
    }

    private suspend fun recuperarConvertido(detalle: BorradorDetalle): Boolean {
        if (detalle.estado != "CONVERTIDO") return false
        val envio = detalle.envio
        if (envio == null) reportarFallo(FalloSiniestros.RespuestaInvalida)
        else confirmarEnvio(envio)
        return true
    }

    private suspend fun confirmarEnvio(envio: EnvioSiniestro) {
        eliminarCopiaLocal()
        _uiState.value.evidencias.forEach { almacen.eliminar(it.archivo) }
        claveIdempotencia = null
        _uiState.update {
            it.copy(
                enviando = false, envioConfirmado = envio, falloFormulario = null, evidencias = emptyList(),
                borradores = it.borradores.filterNot { borrador -> borrador.id == envio.borradorId },
                borradorActualId = null, detalle = null, descripcionBloqueada = false,
            )
        }

        _eventos.send(EventoSiniestros.ReporteEnviado(envio.siniestroId))
    }

    private suspend fun eliminarCopiaLocal() {
        val id = _uiState.value.pendienteLocalId ?: return
        when (val respuesta = almacenPendientes.eliminar(id)) {
            is Resultado.Exito -> _uiState.update { it.copy(pendienteLocalId = null, pendienteGuardadoLocal = false) }
            is Resultado.Fallo -> _uiState.update { it.copy(errorPendientesLocales = respuesta.causa, limpiezaPendienteFallida = true) }
        }
    }

    private suspend fun gestionarFalloEnvio(id: String, fallo: FalloSiniestros) {
        when (val recuperado = repositorio.detalle(id)) {
            is Resultado.Exito -> {
                if (recuperarConvertido(recuperado.valor)) return
                _uiState.update {
                    if (fallo == FalloSiniestros.BorradorModificado) it.copy(
                        detalle = recuperado.valor, descripcion = recuperado.valor.descripcion,
                        causa = recuperado.valor.causa, fechaEvento = recuperado.valor.fechaEvento.orEmpty(),
                    ) else it.copy(detalle = recuperado.valor)
                }
            }
            is Resultado.Fallo -> if (recuperado.causa == FalloSiniestros.SesionVencida || recuperado.causa == FalloSiniestros.NoAutorizado) {
                reportarFallo(recuperado.causa)
                return
            } // Los demas fallos mantienen visible el error de la operacion original.
        }
        if (fallo == FalloSiniestros.UbicacionInvalida) {
            _uiState.update { it.copy(enviando = false, falloUbicacion = fallo) }
            return
        }
        reportarFallo(fallo)
    }

    fun eliminarEvidenciaRegistrada(evidenciaId: String) {
        val estado = _uiState.value
        val id = estado.borradorActualId ?: return
        if (estado.enviando || estado.importandoEvidencia) return
        _uiState.update { it.copy(enviando = true, falloFormulario = null) }
        viewModelScope.launch {
            when (val resultado = repositorio.eliminarEvidencia(id, evidenciaId)) {
                is Resultado.Fallo -> gestionarFalloEnvio(id, resultado.causa)
                is Resultado.Exito -> when (val detalle = repositorio.detalle(id)) {
                    is Resultado.Fallo -> reportarFallo(detalle.causa)
                    is Resultado.Exito -> _uiState.update { it.copy(detalle = detalle.valor, enviando = false) }
                }
            }
        }
    }

    fun cargarHistorial(mas: Boolean = false) {
        val estado = _uiState.value
        if (estado.cargandoHistorial) return
        val cursor = if (mas) estado.siguienteCursor ?: return else null
        _uiState.update { it.copy(cargandoHistorial = true, errorHistorial = null) }
        viewModelScope.launch {
            when (val resultado = repositorio.historial(cursor)) {
                is Resultado.Fallo -> {
                    _uiState.update { it.copy(cargandoHistorial = false, errorHistorial = resultado.causa) }
                    if (resultado.causa == FalloSiniestros.SesionVencida) sesionInvalida()
                }
                is Resultado.Exito -> _uiState.update {
                    it.copy(
                        cargandoHistorial = false,
                        historial = (if (mas) it.historial + resultado.valor.items else resultado.valor.items).distinctBy { item -> item.id },
                        siguienteCursor = resultado.valor.siguienteCursor,
                    )
                }
            }
        }
    }

    fun consultarSiniestro(id: String) {
        cargaReporte?.cancel()
        _uiState.update { it.copy(
            cargandoDetalle = true, reporte = null, falloFormulario = null,
            numeroPolizaReporte = null, cargandoNumeroPolizaReporte = false,
            envioConfirmado = it.envioConfirmado?.takeIf { envio -> envio.siniestroId == id },
        ) }
        cargaReporte = viewModelScope.launch {
            when (val resultado = repositorio.siniestro(id)) {
                is Resultado.Fallo -> {
                    _uiState.update { it.copy(cargandoDetalle = false) }
                    reportarFallo(resultado.causa)
                }
                is Resultado.Exito -> {
                    val reporte = resultado.valor
                    _uiState.update {
                        it.copy(cargandoDetalle = false, reporte = reporte, cargandoNumeroPolizaReporte = true)
                    }
                    val numero = when (val poliza = repositorioPolizas.detalle(reporte.resumen.polizaId)) {
                        is ResultadoPoliza.Exito -> poliza.valor.numero.takeIf { it.isNotBlank() }
                        is ResultadoPoliza.Fallo -> null
                    }
                    _uiState.update { it.copy(numeroPolizaReporte = numero, cargandoNumeroPolizaReporte = false) }
                }
            }
        }
    }

    fun accederEvidencia(evidenciaId: String, directorio: java.io.File, guardar: Boolean) {
        val actual = _uiState.value
        val reporte = actual.reporte ?: return
        if (descargaEvidencia?.isActive == true || actual.archivoPorGuardar != null) return
        if (reporte.evidencias.none { it.id == evidenciaId }) {
            notificarFalloAcceso(FalloSiniestros.EvidenciaNoDisponible)
            return
        }
        _uiState.update { it.copy(descargandoEvidencia = evidenciaId, falloAccesoEvidencia = null, evidenciaGuardada = false) }
        descargaEvidencia = viewModelScope.launch {
            try {
                when (val respuesta = repositorio.descargarEvidencia(reporte.resumen.id, evidenciaId, directorio)) {
                    is Resultado.Fallo -> {
                        notificarFalloAcceso(respuesta.causa)
                        if (respuesta.causa == FalloSiniestros.SesionVencida) sesionInvalida()
                    }
                    is Resultado.Exito -> {
                        if (guardar) _uiState.update { it.copy(archivoPorGuardar = respuesta.valor) }
                        _eventos.send(EventoSiniestros.EvidenciaLista(reporte.resumen.id, respuesta.valor, guardar))
                    }
                }
            } finally {
                _uiState.update { it.copy(descargandoEvidencia = null) }
            }
        }
    }

    fun notificarFalloAcceso(fallo: FalloSiniestros) {
        _uiState.update { it.copy(falloAccesoEvidencia = fallo) }
    }

    fun finalizarGuardadoEvidencia(guardado: Boolean = false) {
        _uiState.value.archivoPorGuardar?.archivo?.let { archivo ->
            archivo.delete()
            archivo.parentFile?.delete()
        }
        _uiState.update { it.copy(archivoPorGuardar = null, evidenciaGuardada = guardado) }
    }

    fun cancelarAccesoEvidencia() {
        descargaEvidencia?.cancel()
        _uiState.update { it.copy(descargandoEvidencia = null, falloAccesoEvidencia = null, evidenciaGuardada = false) }
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
                is Resultado.Exito -> {
                    _uiState.update { it.copy(cargandoDetalle = false, detalle = resultado.valor) }
                    recuperarConvertido(resultado.valor)
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
        val ZONA_COLOMBIA: ZoneId = ZoneId.of("America/Bogota")
        const val ESTADO_ACTIVA = "ACTIVA"
        const val ESTADO_BORRADOR_ABIERTO = "ABIERTO"
        const val MAX_CARACTERES_DESCRIPCION = 2000
        const val EXTENSION_FOTO = "jpg"
        const val EXTENSION_VIDEO = "mp4"
        const val MIME_FOTO = "image/jpeg"
        const val MIME_VIDEO = "video/mp4"
    }
}

private data class DatosCarga(
    val limites: Resultado<com.solventa.feature.siniestros.dominio.LimitesSiniestros>,
    val borradores: Resultado<List<com.solventa.feature.siniestros.dominio.BorradorResumen>>,
    val polizas: ResultadoPoliza<List<PolizaResumen>>,
    val locales: Resultado<List<com.solventa.feature.siniestros.dominio.ResumenPendienteLocal>>,
)
