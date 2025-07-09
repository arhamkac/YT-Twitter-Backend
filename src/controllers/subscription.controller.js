import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(req.user?._id==channelId){
        throw new ApiError(400,"You can't subscribe to your own channel");
    }

    const channel=await User.findById(channelId);
    if(!channel){
        throw new ApiError(400,"Channel with valid id is required");
    }

    const subscriptionStatus=await Subscription.findOne({
        subscriber:req.user?._id,
        channel:channelId
    })

    if(subscriptionStatus){
        await Subscription.deleteOne({_id:subscriptionStatus._id});
        console.log("Unsubscribed");
    }
    else{
        await Subscription.create({
            subscriber:req.user?._id,
            channel:channelId
        })
        console.log("Subscribed");
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,{},"Subscription status changed")
    )

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params

    const channelSubscribers=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscriptions"
            }
        },
        {
            $lookup:{
                from:"users",
                localField:"subscriptions.subscriber",
                foreignField:"_id",
                as:"subscribers"
            }
        },
        {
            $project:{
                username:1,
                fullName:1,
                avatar:1,
                subscribers:{
                   $map:{
                    input:"$subscribers",
                    as:"subs",
                    in:{
                    id:"$$subs._id",
                    username:"$$subs.username",
                    fullName:"$$subs.fullName",
                    avatar:"$$subs.avatar"
                    }
                   }
                }
            }
        }
    ])
    if(!channelSubscribers?.length){
        throw new ApiError(400,"There was an error in getting subscribers")
    }

    return res
    .status(200)
    .json(new ApiResponse(200,channelSubscribers,"Channel Subscribers listed"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    const subscribedChannels=await User.aggregate([
       {
        $match:{
            _id:new mongoose.Types.ObjectId(channelId)
        }
       },
       {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribers"
        }
       },
       {
        $lookup:{
            from:"users",
            localField:"subscribers.channel",
            foreignField:"_id",
            as:"subscriptions"
        }
       },
       {
        $project:{
            username:1,
            fullName:1,
            avatar:1,
            subscriptions:{
                $map:{
                    input:"$subscriptions",
                    as:"subs",
                    in:{
                        id:"$$subs._id",
                        username:"$$subs.username",
                        fullName:"$$subs.fullName",
                        avatar:"$$subs.avatar"
                    }
                }
            }
        }
       }
    ])
    if(!subscribedChannels?.length){
        throw new ApiError(400,"Error fetching user's subscriptions")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200,subscribedChannels,"Channel Subscriptions fetched successfully")
    )

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}