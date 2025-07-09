import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const commentagg=[
        {
            $match:{
                video:new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"owner",
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
                owner:{$first:"$owner"}
            }
        },
        {
            $project:{
                content:1,
                owner:1
            }
        }
    ]

    const comments=await Comment.aggregatePaginate(Comment.aggregate(commentagg),
    {
    page:parseInt(page),
    limit:parseInt(limit),
    customLabels:{
        docs:"comments"
    }
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200,comments,"Comments fetched successfully")
    )

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId}=req.params
    const {content}=req.body

    const video=Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Video with this id does not exist")
    }
    if(!content){
        throw new ApiError(400,"Without any content comment can't be posted")
    }

    const comment=await Comment.create({
        video:videoId,
        content:content,
        owner:req.user?._id
    })
    
    if(!comment){
        throw new ApiError(400,"There was some error in posting comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,comment,"Comment posted successfully")
    )

})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId}=req.params
    // TODO: update a comment
    const {content}=req.body
    const updComment=await Comment.findByIdAndUpdate(
        commentId,
        {
            $set:{
                content:content
            }
        }
    )
    if(!updComment){
        throw new ApiError(400,"Comment could not be updated due to erorr in updating info")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,updComment,"Comment updated successfully")
    )

})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId}=req.params
    // TODO: delete a comment
    const comment=await Comment.findByIdAndDelete(commentId)
    if(!comment){
        throw new ApiError(400,"Comment not deleted")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
