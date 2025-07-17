import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { Tweet } from "../models/tweet.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    const video=await Video.findById(videoId);
    if(!video){
        throw new ApiError(400,"Video with this id does not exist")
    }

    const likeStatus=await Like.findOne({
        video:videoId,
        likedBy:req.user._id
    })
    if(likeStatus){
        const delete_like=await Like.deleteOne({likedBy:req.user?._id})
        if(!delete_like){
           throw new ApiError(400,"Error in changing like status from like to not like")
        }
        console.log("Like removed")
    }
    else{
        const like=await Like.create({
            video:videoId,
            likedBy:req.user._id
        })
        if(!like){
            throw new ApiError(400,"Error in changing like status to liked")
        }
        console.log("Liked the video")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Like status changed successfully")
    )
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    const liked=await Like.findOne({
        comment:commentId,
        likedBy:req.user._id,
    })

    let likeStatus; let a=true;
    if(liked){
        likeStatus=await Like.deleteOne({likedBy:req.user._id});
        console.log("Disliked"); a=false;
    }
    else{
        likeStatus=await Like.create({
            comment:commentId,
            likedBy:req.user._id
        })
        console.log("Liked");
    }

    if(!likeStatus){
        throw new ApiError(400,"Error in toggling")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},
            a ? "Liked the comment" : "Removed Comment Like"
        )
    )

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    const tweet=await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(400,"Tweet does not exist")
    }
    const like=await Like.findOne({
        tweet:tweetId,
        likedBy:req.user?._id
    })
    let a=true;
    if(like){
        await Like.deleteOne({likedBy:req.user._id})
        console.log("Like removed"); a=false;
    }
    else{
        const likes=await Like.create({
            tweet:tweetId,
            likedBy:req.user._id
        })
        if(!likes){
            throw new ApiError(400,"Error in creating like")
        }
        console.log("Liked"); a=true;
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},a?"Liked the tweet":"Removed Tweet like")
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos=await Like.aggregate([
        {
            $match:{
            ...(isValidObjectId(req.user?._id) && {likedBy:new mongoose.Types.ObjectId(req.user._id)}),
            video: { $exists: true, $ne: null } 
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"video",
                foreignField:"_id",
                as:"video",
                pipeline:[
                    {
                        $project:{
                            videoFile:1,
                            title:1,
                            thumbnail:1,
                            description:1,
                            duration:1,
                            views:1,
                            owner:1
                        }
                    }
                ]
            }
        }
    ])

    if(!likedVideos){
        throw new ApiError(400,"Liked videos not found. Ask if there is any liked video by user or not")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,likedVideos,"Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}