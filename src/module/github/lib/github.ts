import { Octokit } from "octokit"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import prisma from "@/lib/prisma"

export const getGithubToken = async () => {
    const session = await auth.api.getSession({
        headers: await headers()
    })

    if (!session) { throw new Error("Unauthorized") }

    console.log("\ntesting what is inside [ auth.api.getSession ]\n\n\n", session, "\n\n\n\n")

    const account = await prisma.account.findFirst({
        where: {
            userId: session.user.id,
            providerId: "github"
        }
    })

    if (!account?.accessToken) {
        throw new Error("No github access token found")
    }

    return account.accessToken

}

export async function findUserContribution(token: string, username: string) {
    const octokit = new Octokit({ auth: token })

    const query = `
        query($username:String!){
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                    contributionDays {
                        date
                        contributionCount
                        color
                    }
                    }
                }
            }
        }
        }
    `

    // interface contributionData{
    //     user:{
    //         contributionsCollection:{
    //             contributionCalendar:{
    //                 totalContributions:number,
    //                 weeks:{
    //                     contributionDays:{
    //                         contributionCount:number,
    //                         date: string | Date,
    //                         color: string
    //                     }
    //                 }
    //             }
    //         }
    //     }
    // }

    try {
        const response:any = await octokit.graphql(query, {username})
        return response.user.contributionsCollection.contributionCalendar
    } catch (error) {
        
    }
}