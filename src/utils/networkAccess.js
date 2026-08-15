export const buildAccessInfo = (serverInfo = null) => {
  const hasWindow = typeof window !== 'undefined'
  const protocol = hasWindow ? window.location.protocol : 'http:'
  const hostname = hasWindow ? window.location.hostname : '本机局域网IP'
  const currentPort = hasWindow ? window.location.port : ''
  const serverPort = String(serverInfo?.port || (currentPort && currentPort !== '3000' ? currentPort : '8080'))
  const lanIp = serverInfo?.lan_ip || hostname || '本机局域网IP'
  const isDevFrontend = currentPort === '3000'
  const webPort = isDevFrontend ? '3000' : serverPort
  const localHost = hasWindow ? window.location.hostname : '127.0.0.1'
  const localAddress = hasWindow
    ? `${protocol}//${localHost}${currentPort ? `:${currentPort}` : ''}`
    : `http://127.0.0.1:${webPort}`

  return {
    localAddress,
    lanAddress: `${protocol}//${lanIp}:${webPort}`,
    apiAddress: `${protocol}//${lanIp}:${serverPort}/api`,
    backendOk: Boolean(serverInfo?.backend_ok || serverInfo?.status === 'ok'),
    isServerClient: Boolean(serverInfo?.is_server_client),
    activeDeviceCount: Number(serverInfo?.active_device_count || 0),
    remoteDeviceCount: Number(serverInfo?.remote_device_count || 0),
    remoteLoggedInCount: Number(serverInfo?.remote_logged_in_count || 0),
    activeClients: serverInfo?.active_clients || [],
    startupScript: serverInfo?.startup_script || null,
    startedAt: serverInfo?.started_at || '',
    isFallback: !serverInfo?.lan_ip
  }
}
