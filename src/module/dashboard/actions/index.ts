"use server"
import { getGithubToken, findUserContribution } from "@/module/github/lib/github"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { Octokit } from "octokit"
import prisma from "@/lib/prisma"

export const getContributionStats = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })
        if (!session) {
            throw new Error("Unauthorized")
        }

        const token = await getGithubToken()
        const ocktokit = new Octokit({ auth: token })

        const { data: user } = await ocktokit.rest.users.getAuthenticated()

        const calendar = await findUserContribution(token, user.login)

        if (!calendar) {
            return null
        }

        const contributions = calendar.weeks.flatMap((week: any) =>
            week.contributionDays.map((day: any) => ({
                date: day.date,
                count: day.contributionCount,
                level: Math.min(4, Math.floor(day.contributionCount / 3)), // Convert to 0-4 scale
            }))
        )

        return {
            contributions,
            totalContributions: calendar.totalContributions
        }

    } catch (error) {

    }
}

export const getDashboardStats = async () => {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        })
        if (!session) {
            throw new Error("Unauthorized")
        }

        const token = await getGithubToken()
        const ocktokit = new Octokit({ auth: token })

        //get user's github username
        const { data: user } = await ocktokit.rest.users.getAuthenticated()

        const calender = await findUserContribution(token, user.login)
        const totalCommits = calender?.totalContributions || 0

        //Find total PRs from database or gitub
        const { data: PRs } = await ocktokit.rest.search.issuesAndPullRequests({
            q: `author:${user.login} type:pr`,
            per_page: 1
        })
        const totalPRs = PRs.total_count

        //TODO :Fetch total connect repos from db
        const totalRepos = 34;

        //TODO: Fetch total ai reviews
        const totalReviews = 21

        return {
            totalCommits,
            totalPRs,
            totalRepos,
            totalReviews
        }

    } catch (error) {
        console.error("Error fetching Dashboard stats", error)
        return {
            totalCommits: 0,
            totalPRs: 0,
            totalRepos: 0,
            totalReviews: 0
        }
    }
}

export async function getMonthlyActivity() {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session?.user) {
            throw new Error("Unauthorized");
        }
        const token = await getGithubToken();
        const octokit = new Octokit({ auth: token })

        const { data: user } = await octokit.rest.users.getAuthenticated()

        const calendar = await findUserContribution(token, user.login)

        if (!calendar) {
            return [];
        }

        const monthlyData: {
            [key: string]: { commits: number; prs: number; reviews: number }
        } = {}

        const monthNames = [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
        ];

        // Initialize last 6 months
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = monthNames[date.getMonth()];
            monthlyData[monthKey] = { commits: 0, prs: 0, reviews: 0 };
        }

        calendar.weeks.forEach((week: any) => {
            week.contributionDays.forEach((day: any) => {
                const date = new Date(day.date);
                const monthKey = monthNames[date.getMonth()];
                if (monthlyData[monthKey]) {
                    monthlyData[monthKey].commits += day.contributionCount;
                }
            })
        })

        // Fetch reviews from database for last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);


        // TODO: REVIEWS'S REAL DATA
        const generateSampleReviews = () => {
            const sampleReviews = [];
            const now = new Date();

            // Generate random reviews over the past 6 months
            for (let i = 0; i < 45; i++) {
                const randomDaysAgo = Math.floor(Math.random() * 180); // Random day in last 6 months
                const reviewDate = new Date(now);
                reviewDate.setDate(reviewDate.getDate() - randomDaysAgo);

                sampleReviews.push({
                    createdAt: reviewDate,
                });
            }

            return sampleReviews;
        };

        const reviews = generateSampleReviews()

        reviews.forEach((review) => {
            const monthKey = monthNames[review.createdAt.getMonth()];
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].reviews += 1;
            }
        })

        const { data: prs } = await octokit.rest.search.issuesAndPullRequests({
            q: `author:${user.login} type:pr created:>${sixMonthsAgo.toISOString().split("T")[0]
                }`,
            per_page: 100,
        });

        prs.items.forEach((pr: any) => {
            const date = new Date(pr.created_at);
            const monthKey = monthNames[date.getMonth()];
            if (monthlyData[monthKey]) {
                monthlyData[monthKey].prs += 1;
            }
        });

        return Object.keys(monthlyData).map((name) => ({
            name,
            ...monthlyData[name]
        }))

    } catch (error) {
        console.error("Error fetching monthly activity:", error);
        return [];
    }
}
