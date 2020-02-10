export interface IArticle {
    id: string,
    title: string,
    author: string,
    description: string,
    keywords: string[],
    content: string,
    slug: string,
    publishedTime: {
        seconds: number,
        nanoseconds: number
    },
    imgUrl: string,
    imgAlt: string
}