--[[
    licensing-sdk / server/main.lua

    This is the piece that other developers' resources depend on. It:
      1. Validates the configured license against the central API on boot
      2. Sends a periodic "heartbeat" to re-validate + let the API record
         which server IP is currently using this license (leak detection)
      3. Exposes IsLicensed() / GetLicenseStatus() exports for other
         resources to check before running protected features
      4. Locks itself down if the license is invalid, revoked, or the API
         can't be reached after Config.MaxFailedHeartbeats tries

    IMPORTANT: This file never sends the server's IP address explicitly.
    The API records the IP the HTTP request actually came from, which
    can't be faked by editing config.lua. That's what makes IP binding
    and leak detection meaningful.
]]

local licenseValid = false
local failedHeartbeats = 0
local resourceName = GetCurrentResourceName()

local function debugPrint(msg)
    if Config.Debug then
        print(('^3[licensing-sdk] %s^7'):format(msg))
    end
end

local function buildPayload()
    return {
        productKey = Config.ProductKey,
        licenseKey = Config.LicenseKey,
        resourceName = resourceName,
        serverHostname = GetConvar('sv_hostname', 'unknown'),
        serverProjectName = GetConvar('sv_projectName', 'unknown'),
        fxVersion = GetConvar('version', 'unknown')
    }
end

---Called whenever the license becomes (or remains) invalid.
---@param reason string
local function lockdown(reason)
    if licenseValid then
        print(('^1[licensing-sdk] LICENSE LOCKED: %s^7'):format(reason))
        print('^1[licensing-sdk] Protected features are now disabled. Check config.lua and your license status on the dashboard.^7')
    end
    licenseValid = false
end

---Runs one validation/heartbeat cycle.
---@param onComplete function|nil  optional callback(valid: boolean)
local function checkLicense(onComplete)
    local ok, statusCode, decoded = Http.Post('/api/validate', buildPayload())

    if not ok then
        failedHeartbeats = failedHeartbeats + 1
        debugPrint(('Request to licensing API failed (network/unreachable). Failure %d/%d.'):format(failedHeartbeats, Config.MaxFailedHeartbeats))

        if failedHeartbeats >= Config.MaxFailedHeartbeats then
            lockdown('Could not reach the licensing API after multiple attempts.')
        end
        if onComplete then onComplete(licenseValid) end
        return
    end

    if statusCode ~= 200 or type(decoded) ~= 'table' then
        failedHeartbeats = failedHeartbeats + 1
        debugPrint(('Licensing API returned an unexpected response (HTTP %d).'):format(statusCode))

        if failedHeartbeats >= Config.MaxFailedHeartbeats then
            lockdown('Licensing API returned an unexpected/invalid response.')
        end
        if onComplete then onComplete(licenseValid) end
        return
    end

    if decoded.valid == true then
        if not licenseValid then
            print('^2[licensing-sdk] License verified. Protected features enabled.^7')
        end
        licenseValid = true
        failedHeartbeats = 0
        debugPrint('Heartbeat OK.')
    else
        lockdown(decoded.reason or 'License rejected by the licensing API.')
    end

    if onComplete then onComplete(licenseValid) end
end

-- Enforcement: if EnforcementMode is 'kick_all', block joins while invalid.
-- Registered once, checks the current state live rather than re-registering
-- a new handler every lockdown.
AddEventHandler('playerConnecting', function(name, setKickReason, deferrals)
    if Config.EnforcementMode == 'kick_all' and not licenseValid then
        setKickReason('This server is currently unable to verify a required license. Please contact the server owner.')
        CancelEvent()
    end
end)

CreateThread(function()
    Wait(2000) -- let the resource + networking finish booting first
    checkLicense()

    while true do
        Wait(Config.HeartbeatInterval * 1000)

        -- If we're in kick_all mode and currently locked down, also drop
        -- anyone already connected, not just block new joins.
        if Config.EnforcementMode == 'kick_all' and not licenseValid then
            for _, playerId in ipairs(GetPlayers()) do
                DropPlayer(playerId, 'This server is currently unable to verify a required license. Please contact the server owner.')
            end
        end

        checkLicense()
    end
end)

exports('IsLicensed', function()
    return licenseValid
end)

exports('GetLicenseStatus', function()
    return {
        valid = licenseValid,
        failedHeartbeats = failedHeartbeats,
        enforcementMode = Config.EnforcementMode
    }
end)