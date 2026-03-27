import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: "./server/.env" });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const email = "ayaayou000@gmail.com";

(async () => {
  try {
    // 1. Get user from auth
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) throw usersError;
    
    const user = users.find(u => u.email === email);
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }
    
    const userId = user.id;
    console.log(`Found user ID: ${userId}`);
    
    // 2. Get and delete all plants owned by this seller
    const { data: plants } = await supabase
      .from('plants')
      .select('id')
      .eq('seller_id', userId);
    
    if (plants && plants.length > 0) {
      const plantIds = plants.map(p => p.id);
      console.log(`Deleting ${plants.length} plants...`);
      
      const { error: deleteOrderItemsError } = await supabase
        .from('order_items')
        .delete()
        .in('plant_id', plantIds);
      if (deleteOrderItemsError) throw deleteOrderItemsError;
      
      const { error: deletePlantsError } = await supabase
        .from('plants')
        .delete()
        .eq('seller_id', userId);
      if (deletePlantsError) throw deletePlantsError;
      console.log(`✅ Deleted ${plants.length} plants and related order items`);
    }
    
    // 3. Get and delete all orders where this user is seller
    const { data: sellerOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('seller_id', userId);
    
    if (sellerOrders && sellerOrders.length > 0) {
      const orderIds = sellerOrders.map(o => o.id);
      console.log(`Deleting ${sellerOrders.length} orders (as seller)...`);
      
      const { error: deleteOrderItemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (deleteOrderItemsError) throw deleteOrderItemsError;
      
      const { error: deletePaymentsError } = await supabase
        .from('payments')
        .delete()
        .in('order_id', orderIds);
      if (deletePaymentsError) throw deletePaymentsError;
      
      const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .eq('seller_id', userId);
      if (deleteOrdersError) throw deleteOrdersError;
      console.log(`✅ Deleted ${sellerOrders.length} orders (as seller)`);
    }
    
    // 4. Get and delete all orders where this user is buyer
    const { data: buyerOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('buyer_id', userId);
    
    if (buyerOrders && buyerOrders.length > 0) {
      const orderIds = buyerOrders.map(o => o.id);
      console.log(`Deleting ${buyerOrders.length} orders (as buyer)...`);
      
      const { error: deleteOrderItemsError } = await supabase
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (deleteOrderItemsError) throw deleteOrderItemsError;
      
      const { error: deletePaymentsError } = await supabase
        .from('payments')
        .delete()
        .in('order_id', orderIds);
      if (deletePaymentsError) throw deletePaymentsError;
      
      const { error: deleteOrdersError } = await supabase
        .from('orders')
        .delete()
        .eq('buyer_id', userId);
      if (deleteOrdersError) throw deleteOrdersError;
      console.log(`✅ Deleted ${buyerOrders.length} orders (as buyer)`);
    }
    
    // 5. Delete from cart_items
    const { error: deleteCartError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);
    if (deleteCartError) throw deleteCartError;
    console.log(`✅ Deleted cart items`);
    
    // 6. Delete from messages (as sender or receiver)
    const { error: deleteMessagesError } = await supabase
      .from('messages')
      .delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
    if (deleteMessagesError) throw deleteMessagesError;
    console.log(`✅ Deleted messages`);
    
    // 7. Delete user profile
    const { error: deleteProfileError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    if (deleteProfileError) throw deleteProfileError;
    console.log(`✅ Deleted profile`);
    
    // 8. Delete user from auth
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;
    console.log(`✅ Deleted user from auth`);
    
    console.log(`\n✅ Successfully deleted ${email} and all related data!`);
    
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
})();
