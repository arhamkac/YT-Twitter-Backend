import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {v2 as cloudinary} from "cloudinary"

function extractPublicId(url) {
  const parts = url.split('/');
  const fileName = parts[parts.length - 1];
  const publicId = fileName.split('.')[0]
  return publicId;
}

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query:search, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    
    const pipeline=[
        {
            $match:{
                ...(search &&{
                    title:{$regex:search, $options:"im"} //regex-used for pattern matching and options-i(case insensitive),m(full find)
                }),
                ...(isValidObjectId(userId) &&{
                    owner:new mongoose.Types.ObjectId(userId)
                })
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
        }
    ]

    if(!pipeline){
        throw new ApiError(500,"Some server error in fetching videos")
    }

    const videos=await Video.aggregatePaginate(Video.aggregate(pipeline),{
        page:parseInt(page),
        limit:parseInt(limit),
        sort:{[sortBy]:parseInt(sortType)},
        customLabels: {
           docs: "videos"
        }
    }) 

    if(!videos){
        throw new ApiError(400,"Check the queries whether they are valid or not")
    }

    return res
    .status(200)
    .json(new ApiResponse(
        200,videos,"Videos fetched successfully"
    ))

})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create 
    //Steps:-
    //get title and description
    if(!title || !description){
        throw new ApiError(400,"Video description and title are required")
    }
    
    const videoLocalPath=req.files?.videoFile[0]?.path;
    if(!videoLocalPath){
        throw new ApiError(400,"Video is required to publish")
    }
    const thumbnailLocalPath=req.files?.thumbnail[0]?.path;
    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail is required to publish")
    }

    const videoFile=await uploadOnCloudinary(videoLocalPath)
    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
    if(!videoFile || !thumbnail){
        throw new ApiError(400,"Error uploading video or thumbnail to cloudinary")
    }

    const user=await User.findById(req.user._id)

    const video=await Video.create({
    title,
    description,
    videoFile:videoFile.url,
    thumbnail:thumbnail.url,
    owner:user._id,
    duration:videoFile.duration
    })

    const uploadedVideo=await Video.findById(video._id)
    if(!uploadedVideo){
        throw new ApiError(400,"Video couldn't be uploaded")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,uploadedVideo,"Video uploaded successfully"
        )
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video=await Video.findById(videoId)
    if(!video){
        throw new ApiError(400,"Cannot find video with this id")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,video,"Video fetched successfully"
        )
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const updateData={}

    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title,description}=req.body
    
    const video_for_deletion=await Video.findById(videoId)
    if(!video_for_deletion){
    throw new ApiError(404,"No video with this id exists")
    }

    const thumbnailLocalPath=req.file?.path

    if(thumbnailLocalPath){
    const oldThumbnail=extractPublicId(video_for_deletion.thumbnail)

    const thumbnail=await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail?.url){
        await fs.unlinkSync(thumbnailLocalPath);
        throw new ApiError(400,"Thumbnail upload failed")
    }
    updateData.thumbnail=thumbnail.url
    await cloudinary.uploader.destroy(oldThumbnail)
    }

    if(title!=undefined){updateData.title=title}
    if(description!=undefined){updateData.title=description}


    const video=await Video.findByIdAndUpdate(
        videoId,
        {$set:updateData},
        {new:true}
    )

    return res
    .status(200)
    .json(
        new ApiResponse(200,video,"Video details updated successfully")
    )
    
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    const video_for_files_deletion=await Video.findById(videoId)
    const oldThumbnail=extractPublicId(video_for_files_deletion.thumbnail)
    const oldVideo=extractPublicId(video_for_files_deletion.videoFile)

    const deletedVideo=await Video.findByIdAndDelete(videoId)
    if(!deletedVideo){
        throw new ApiError(404,"Video with this ID does not exist")
    }


    const videoDeletion = await cloudinary.uploader.destroy(oldVideo, {
    resource_type: "video"
    });
    console.log(oldVideo)
    if(videoDeletion.result!=="ok"){
        throw new ApiError(400,"There was an error in deleting video from cloudinary")
    }
    console.log(oldThumbnail)
    const thumbnailDeletion=await cloudinary.uploader.destroy(oldThumbnail)
    if(!thumbnailDeletion){
        throw new ApiError(400,"There was an error in deleting thumbnail from cloudinary")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Video deleted successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const existingVideo=await Video.findById(videoId)
    if(!existingVideo){
        throw new ApiError(404,"Video with this id doesn't exist")
    }

    const video=await Video.findByIdAndUpdate(
        videoId,
        {
            $set:{
                isPublished:!existingVideo.isPublished
            }
        },
        {new:true}
    )

    return res
    .status(200)
    .json(new ApiResponse(200,video,"Publish status updated successfully"))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
