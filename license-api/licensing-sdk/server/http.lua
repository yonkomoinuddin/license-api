--[[
    Thin wrapper around FiveM's native PerformHttpRequest.

    PerformHttpRequest is async and callback-based by default, which is
    awkward to use inline. This wraps it in a Lua coroutine so calling
    code can just do:

        local ok, status, body = Http.Post('/api/validate', payloadTable)

    and read the result on the next line, same as a normal function call.
]]

Http = {}

---Performs a POST request with a JSON body and waits for the response.
---@param path string  Path appended to Config.ApiUrl, e.g. '/api/validate'
---@param bodyTable table  Lua table to encode as the JSON body
---@return boolean success  true if we got an HTTP response at all (any status code)
---@return number statusCode  HTTP status code, or 0 if the request failed outright
---@return table|nil decoded  Decoded JSON response body, or nil if decoding failed
function Http.Post(path, bodyTable)
    local co = coroutine.running()
    if not co then
        error('Http.Post must be called from inside a thread (CreateThread), not the main scope.')
    end

    local url = Config.ApiUrl .. path
    local headers = {
        ['Content-Type'] = 'application/json',
        ['Accept'] = 'application/json'
    }

    PerformHttpRequest(url, function(statusCode, responseBody, responseHeaders)
        local ok = statusCode ~= nil and statusCode ~= 0
        local decoded = nil

        if type(responseBody) == 'string' and responseBody ~= '' then
            local decodeOk, result = pcall(json.decode, responseBody)
            if decodeOk then
                decoded = result
            end
        end

        -- Resume the coroutine that called Http.Post with the results
        local resumeOk, resumeErr = coroutine.resume(co, ok, statusCode or 0, decoded)
        if not resumeOk then
            print(('^1[licensing-sdk] Coroutine resume error: %s^7'):format(tostring(resumeErr)))
        end
    end, 'POST', json.encode(bodyTable), headers)

    -- Yield here until the PerformHttpRequest callback resumes us
    return coroutine.yield()
end