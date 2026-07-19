Config = {}

-- =============================================================================
--  PRODUCT KEY
--  This identifies YOUR script/product on the licensing API. You (the
--  developer) get this once when you register your product on the
--  dashboard. It is the SAME for every customer who buys this product.
-- =============================================================================
Config.ProductKey = 'CHANGE_ME_PRODUCT_KEY'

-- =============================================================================
--  LICENSE KEY
--  This is unique PER CUSTOMER. You generate one on the dashboard for each
--  sale and give it to that buyer to paste in here. This is what actually
--  gets checked, revoked, and IP-bound.
-- =============================================================================
Config.LicenseKey = 'CHANGE_ME_CUSTOMER_LICENSE_KEY'

-- =============================================================================
--  API URL
--  Base URL of your licensing API, no trailing slash.
--  Example: 'https://license.yourdomain.com'
-- =============================================================================
Config.ApiUrl = 'https://license.yourdomain.com'

-- =============================================================================
--  HEARTBEAT INTERVAL (seconds)
--  How often the resource re-checks its license with the API after the
--  initial boot check. Lower = catches revocations/leaks faster, but more
--  requests to your API. 600 (10 minutes) is a sensible default.
-- =============================================================================
Config.HeartbeatInterval = 600

-- =============================================================================
--  MAX FAILED HEARTBEATS
--  If the API can't be reached (network issue, API down) this many times
--  IN A ROW, the resource locks itself down rather than failing open.
--  Set higher if your hosting has flaky outbound connectivity.
-- =============================================================================
Config.MaxFailedHeartbeats = 3

-- =============================================================================
--  ENFORCEMENT MODE
--  What happens when the license is invalid, revoked, or fails validation:
--    'disable'   -> IsLicensed() returns false; protected scripts should
--                   check this and quietly no-op. Server keeps running.
--    'kick_all'  -> Also drops all connected players and blocks new joins
--                   with a message, until the license is valid again.
-- =============================================================================
Config.EnforcementMode = 'disable'

-- =============================================================================
--  DEBUG
--  Prints extra validation/heartbeat info to the server console. Turn this
--  off in production.
-- =============================================================================
Config.Debug = false