import mongoose from "mongoose";
export declare const Message: mongoose.Model<{
    roomId: string;
    username: string;
    message: string;
    timestamp: NativeDate;
}, {}, {}, {}, mongoose.Document<unknown, {}, {
    roomId: string;
    username: string;
    message: string;
    timestamp: NativeDate;
}, {}, mongoose.DefaultSchemaOptions> & {
    roomId: string;
    username: string;
    message: string;
    timestamp: NativeDate;
} & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}, mongoose.Schema<any, mongoose.Model<any, any, any, any, any, any>, {}, {}, {}, {}, mongoose.DefaultSchemaOptions, {
    roomId: string;
    username: string;
    message: string;
    timestamp: NativeDate;
}, mongoose.Document<unknown, {}, mongoose.FlatRecord<{
    roomId: string;
    username: string;
    message: string;
    timestamp: NativeDate;
}>, {}, mongoose.ResolveSchemaOptions<mongoose.DefaultSchemaOptions>> & mongoose.FlatRecord<{
    roomId: string;
    username: string;
    message: string;
    timestamp: NativeDate;
}> & {
    _id: mongoose.Types.ObjectId;
} & {
    __v: number;
}>>;
//# sourceMappingURL=message.d.ts.map