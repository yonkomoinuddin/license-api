fx_version 'cerulean'
game 'gta5'
lua54 'yes'

author 'Your Name Here'
description 'Licensing & Anti-Piracy SDK - server-side license validation for FiveM resources'
version '1.0.0'

-- Loaded ONLY on the server. This SDK never runs on the client, since
-- license validation must not be something a player can inspect or bypass.
server_scripts {
    'config.lua',
    'server/http.lua',
    'server/main.lua'
}

-- Other resources call these via:
--   exports['licensing-sdk']:IsLicensed()
--   exports['licensing-sdk']:GetLicenseStatus()
server_exports {
    'IsLicensed',
    'GetLicenseStatus'
}