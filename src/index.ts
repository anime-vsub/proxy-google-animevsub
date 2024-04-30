import { Hono } from "hono"
import { cors } from "hono/cors"
import { stream } from "hono/streaming"

const app = new Hono()

app.use(
  "*",
  cors({
    origin: [
      "https://animevsub.eu.org",
      "https://animevsub.netlify.app",
      "http://localhost:9000",
      "http://localhost:9200",
      "https://example.com",
    ],
  }),
)

// https://lh3/R_ISiRJ4j1U0tiEuNrFgQ3_AsFzH5MdMlh-wkah9evd5GWl06k8MALlgHmkj6l85pyfBxUXqsgWj6x91qU0NepSc7U46y9hlbLEfywoUQ1VBlMfkUR7l-JWrlG4=d

app.get("/resolve/:locate/:id", async (c) => {
  const { locate, id } = c.req.param()

  const url = new URL(
    `/${id}`,
    `https://${encodeURIComponent(locate)}.googleusercontent.com`,
  )
  const time = performance.now()
  const response = await fetch(url).catch(() => ({
    text: () => "Unknown error",
    ok: false,
    status: 407,
  }))
  const end = performance.now() - time

  c.header("x-time", end + "ms")
  return c.newResponse(await response.text(), response)
})

app.get("/stream", async (c) => {
  let url = c.req.query("url")
  // https://stream.googleapiscdn.com/chunks/660d60aeec575f73bdd6a3d6/original/DBcZHSxCVjVJWyhOViUBBWxJAhsDDgIOERAIHzwICwAJBxpFBwwASG0hXSQDIAUtIDkHBxsIVzAOIAMgEgQyPC8yMURBJl8EOwQcKxRKAiAdKAsOVDkJKwcBEhoHUQsvKSwfCWgsXR82JToMMFdYJh09LUw2HSdfNhk0HQkGNFk4DgdZXA8jODUxICNZGQpZDS4VXTQWDSwiMAYSJiE7NQsSCTpcTF0vAA/video0.html
  if (!url) {
    return c.text("Param url is required", 408)
  }

  url = new URL(url, "https://stream.googleapiscdn.com") + ""

  try {
    const controller = new AbortController()
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { referer: "https://animevietsub.tv" },
    })

    if (!response.ok) {
      return c.newResponse("", response)
    }

    // Set appropriate headers for streaming
    c.res.headers.set(
      "Content-Type",
      response.headers.get("Content-Type") || "",
    )
    c.res.headers.set(
      "Content-Length",
      response.headers.get("Content-Length") || "",
    )

    return stream(c, async (stream) => {
      stream.onAbort(() => {
        controller.abort()
        console.log("Aborted!")
      })

      const reader = response.body?.getReader()
      while (true) {
        const { done, value } = await reader!.read()
        if (done) break
        await stream.write(value)
      }

      await stream.close()
    })
  } catch (error) {
    console.warn(error)
    return c.body("Unknown error", 407)
  }
})

// Deno.serve(app.fetch)

export default app
