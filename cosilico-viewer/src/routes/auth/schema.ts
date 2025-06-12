import { z } from "zod";
 
export const formSchema = z.object({
 email: z.string().min(2).max(50),
 password: z.string().min(6).max(30),
});
 
export type FormSchema = typeof formSchema;