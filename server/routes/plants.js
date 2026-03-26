import express from "express";
import supabase from "../config/supabase.js";

const router = express.Router();

// GET all plants
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("plants")
    .select(`
      *,
      profiles (
        full_name,
        avatar_url
      )
    `);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// POST create plant
router.post("/", async (req, res) => {
  const { data, error } = await supabase
    .from("plants")
    .insert([req.body])
    .select();

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

export default router;