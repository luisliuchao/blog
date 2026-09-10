export const site = {
  title: 'Luis Liu',
  tagline: 'Notes on building things',
  author: 'Liu Chao',
  url: 'https://blog.luisliuchao.com',
  language: 'en',
  bind: process.env.BLOG_BIND ?? '0.0.0.0',
  port: Number(process.env.BLOG_PORT ?? 5176)
};
