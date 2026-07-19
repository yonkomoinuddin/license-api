# licensing-sdk (FiveM Resource)

Server-side license validation SDK. This resource does **not** protect a
script by itself — it's a dependency that other resources check against
before running their protected logic. Pair it with the `license-api`
backend (separate folder in this delivery) which handles issuing,
revoking, and IP-binding licenses via a web dashboard.

---

## 1. Where this goes on your FiveM server

Your server has a `resources/` folder. Drop the whole `licensing-sdk`
folder in there, unmodified in name:

(Some setups organize resources into category folders like `[standalone]`
— if yours does, put it at `resources/[standalone]/licensing-sdk/`. The
folder name `licensing-sdk` itself must stay exact, since your other
scripts will reference it by that name.)

## 2. Enable it in server.cfg

Add this line **before** any resource that depends on it:

## 3. Configure it

Open `config.lua` and set:

| Setting | What it is |
|---|---|
| `Config.ProductKey` | The key identifying *your product*, issued once from the dashboard when you register it. |
| `Config.LicenseKey` | The key for *this specific customer*, generated per-sale on the dashboard. |
| `Config.ApiUrl` | Where your `license-api` backend is deployed, e.g. `https://license.yourdomain.com`. |
| `Config.HeartbeatInterval` | How often (seconds) it re-checks the license after boot. Default `600`. |
| `Config.MaxFailedHeartbeats` | How many failed API calls in a row before locking down. Default `3`. |
| `Config.EnforcementMode` | `'disable'` (quietly disable protected features) or `'kick_all'` (also kick/block players). |
| `Config.Debug` | `true` to print verbose validation logs to console. |

No Lua editing required beyond this file.

## 4. How you protect YOUR script with this (for developers)

In the resource you're selling, add `licensing-sdk` as a dependency in
its `fxmanifest.lua`:

```lua
dependency 'licensing-sdk'
```

Then, at the top of your protected server-side logic:

```lua
CreateThread(function()
    while true do
        Wait(5000)

        if not exports['licensing-sdk']:IsLicensed() then
            print('^1[your-script] License invalid — protected features disabled.^7')
        else
            -- your script's normal logic runs here
        end
    end
end)
```

Or gate a specific event/export:

```lua
RegisterNetEvent('your-script:someProtectedAction', function()
    if not exports['licensing-sdk']:IsLicensed() then return end
    -- do the protected thing
end)
```

`GetLicenseStatus()` is also available if you want more detail (e.g. to
show an admin an in-game message about why something's disabled):

```lua
local status = exports['licensing-sdk']:GetLicenseStatus()
-- status.valid, status.failedHeartbeats, status.enforcementMode
```

## 5. How leak detection actually works

You don't configure an IP anywhere in this file — that's intentional.
The `license-api` backend records the real source IP of each validation
request itself (it can't be spoofed by editing `config.lua`). The first
server that validates a given license key gets auto-bound to it; if that
same license key later shows up from a different server (e.g. someone
leaked the resource and it's running on another box), the API rejects it
and logs the attempt, visible on your dashboard.

If you ever need to move a license to a new IP legitimately (customer
changed hosts), use the "Rebind" button on the dashboard to clear the
binding — the next validation from the new server will bind fresh.