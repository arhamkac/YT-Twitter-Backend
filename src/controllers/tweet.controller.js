import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content}=req.body
    if(!content){
        throw new ApiError(404, "Can't pulblish a tweet without a description")
    }

    const user=await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(400,"You are not an authorized user")
    }

    const tweet=await Tweet.create({
        content:content,
        owner:user?._id
    })
    if(!tweet){
        throw new ApiError(400,"Tweet was not created")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,tweet,"Tweet posted successfully")
    )

})

const getUserTweets = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 10;
const search = req.query.search || null;
    // TODO: get user tweets
    const user=await User.findById(req.user._id)
    if(!user){
        throw new ApiError(400,"Cannot find user")
    }

    const tweets=await Tweet.aggregate([
        {
            $match:{
                ...(search && {
                    content:{$regex:search, $options:"im"}
                }),
                ...(isValidObjectId(user._id) && {owner:new mongoose.Types.ObjectId(user._id)})
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails",
                pipeline:[
                    {
                    $project:{
                            username:1,
                            fullName:1,
                            avatar:1
                    }
                  }
                ]
            }
        },
        {
            $addFields:{
                owner:{$first:"$ownerDetails"}
            }
        },
        {
            $skip:(page-1)*limit
        },
        {
            $limit:limit
        }
    ])

    if(!tweets){
        throw new ApiError(500,"Error in fetching tweets")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,tweets,"Tweets fetched successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    const {tweetId}=req.params
    const {content}=req.body
    //TODO: update tweet
    const tweet=await Tweet.findByIdAndUpdate(
        tweetId,{
            $set:{content:content}
        },
        {new:true}
    )

    if(!tweet){
        throw new ApiError(400,"There was an error in updating the tweet")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,tweet,"Tweet updated successfully"
    ))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId}=req.params
    if(!tweetId){
        throw new ApiError(400,"Cannot delete tweet without Id")
    }

    const tweet=await Tweet.findByIdAndDelete(tweetId)

    if(!tweet){
        throw new ApiError(400,"Tweet cannot be found")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,{},"Tweet deleted successfully"
    ))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
