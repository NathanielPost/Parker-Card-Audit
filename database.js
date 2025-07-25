
const express = require('express');
const sql = require('mssql');

const router = express.Router();

const PROXY_URL = process.env.DB_PROXY_URL || 'http://localhost:3002';


router.get('/schema', async (req, res) => {
  console.log('📨 Schema endpoint hit!'); // This should now show
  console.log('🔧 Request path:', req.path);
  console.log('🔧 Request URL:', req.url);
  
  try {
    console.log('🔗 Attempting to connect to database...');
    await sql.connect(config);
    console.log('✅ Connected to database successfully');

    //Get all table names
    const tablesResult = await sql.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
    `);

    const tableNames = tablesResult.recordset.map(row => row.TABLE_NAME);

    const allSchemas = {};

    // Loop through tables and get column info
    for (const tableName of tableNames) {
      const columnsResult = await sql.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}'
      `);

      allSchemas[tableName] = columnsResult.recordset;
    }

    res.json({
      schema: allSchemas
    });
  } catch (err) {
    console.error('💥 Connection failed:', err.message);
    console.error('💥 Full error:', err);
    res.status(500).json({ 
      error: 'Database connection failed', 
      details: err.message,
      code: err.code 
    });
    return;
  } finally {
    await sql.close();
  }
});
router.post('/contacts', async (req, res) => {
    // Your existing commented code can stay here for future use
    res.json({ message: 'Contacts endpoint - coming soon' });
});

router.get('/accessIds_for_location', async (req, res) => {
    const locationCode = req.query.locationCode;
    console.log(`🔍 Starting with locationCode: ${locationCode}`);

    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input('locationCode', sql.Int, parseInt(locationCode, 10));

        let LocationId;
        let subId;
        let members;
        let accessIds;
        
        // QUERY 1: Test Parcs_Locations with detailed logging
        console.log(`🔍 QUERY 1: Testing Parcs_Locations...`);
        try {
            LocationId = await request.query(`
                SELECT LOCATION_ID FROM Parcs_Locations
                WHERE LOCATION_CODE IS NOT NULL
                AND LOCATION_CODE != 'undefined'
                AND LOCATION_CODE != 'null' 
                AND LOCATION_CODE != ''
                AND TRY_CAST(LOCATION_CODE AS INT) IS NOT NULL
                AND LOCATION_CODE = @locationCode
            `);
            console.log(`✅ QUERY 1 SUCCESS: Found ${LocationId.recordset.length} locations`);
            console.log(`📋 QUERY 1 RESULT:`, LocationId.recordset[0].LOCATION_ID);
        } catch (err) {
            console.error(`❌ QUERY 1 FAILED in Parcs_Locations table:`, err.message);
            throw new Error(`Parcs_Locations query failed: ${err.message}`);
        }

        if (!LocationId.recordset[0].LOCATION_ID) {
            return res.status(404).json({ message: 'Location not found' });
        }

        const locationPlatformId = LocationId.recordset[0].LOCATION_ID;
        console.log(`🔍 Using locationPlatformId: ${locationPlatformId}`);

        // QUERY 2: Test Subscriptions with detailed logging
        console.log(`🔍 QUERY 2: Testing Subscriptions...`);
        try {
            subId = await sql.query(`
                SELECT id FROM Subscriptions
                WHERE locationPlatformId = '${locationPlatformId}'
            `);
            console.log(`✅ QUERY 2 SUCCESS: Found ${subId.recordset.length} subscriptions`);
            console.log(`📋 QUERY 2 RESULT:`, subId.recordset);
        } catch (err) {
            console.error(`❌ QUERY 2 FAILED in Subscriptions table:`, err.message);
            throw new Error(`Subscriptions query failed: ${err.message}`);
        }

        if (subId.recordset.length === 0) {
            return res.status(404).json({ message: 'Subscription not found' });
        }

        const subscriptionIds = subId.recordset.map(s => s.id);
        console.log(`🔍 Using subscriptionIds: [${subscriptionIds.join(', ')}]`);

        // QUERY 3: Test Members with detailed logging
        console.log(`🔍 QUERY 3: Testing Members...`);
        try {
            members = await sql.query(`
                SELECT id, firstName, lastName, email FROM Members
                WHERE subscriptionId IN (${subscriptionIds.join(', ')})
            `);
            console.log(`✅ QUERY 3 SUCCESS: Found ${members.recordset.length} members`);
            console.log(`📋 QUERY 3 RESULT:`, members.recordset);
        } catch (err) {
            console.error(`❌ QUERY 3 FAILED in Members table:`, err.message);
            throw new Error(`Members query failed: ${err.message}`);
        }

        if (members.recordset.length === 0) {
            return res.status(404).json({ message: 'Members not found' });
        }

        const memberIds = members.recordset.map(m => m.id);

        console.log(`🔍 Using memberIds: [${memberIds.join(', ')}]`);

        // QUERY 4: Test Tokens with detailed logging
        console.log(`🔍 QUERY 4: Testing Tokens...`);
        try {
            accessIds = await sql.query(`
                SELECT DISTINCT accessId FROM Tokens
                WHERE memberId IN (${memberIds.join(', ')})
                AND accessId IS NOT NULL
                AND accessId != 'undefined'
                AND accessId != 'null'
                AND accessId != ''
                ORDER BY accessId
            `);
            console.log(`✅ QUERY 4 SUCCESS: Found ${accessIds.recordset.length} access IDs`);
            console.log(`📋 QUERY 4 RESULT:`, accessIds.recordset);
        } catch (err) {
            console.error(`❌ QUERY 4 FAILED in Tokens table:`, err.message);
            throw new Error(`Tokens query failed: ${err.message}`);
        }

        res.json({
            message: 'Success! All queries completed',
            data: accessIds.recordset.map(a => String(a.accessId))
        });
        console.log(`✅ Response sent ${accessIds.recordset.map(a => String(a.accessId))}`);

    } catch (error) {
        console.error(`💥 OVERALL ERROR:`, error.message);
        console.error(`💥 ERROR STACK:`, error.stack);
        res.status(500).json({
            error: 'Database query failed',
            details: error.message
        });
    } finally {
        await sql.close();
    }
});

router.get('/tokens', async (req, res) => {
    try {
        await sql.connect(config);
        const Members = await sql.query(`
            SELECT TOP 100 * FROM Tokens
            WHERE memberId IS NOT NULL AND accessId IS NOT NULL
            ORDER BY id
        `);
        res.json({
            message: 'Tokens data retrieved successfully',
            data: Members.recordset
        });
    } catch (error) {
        console.error('❌ Error retrieving tokens data:', error);
        res.status(500).json({
            error: 'Failed to retrieve tokens data',
            details: error.message
        });
        return;
    } finally {
        await sql.close();
    }
});

router.get('/locations', async (req, res) => {
    try {
        await sql.connect(config);
        const Locations = await sql.query(`
            SELECT TOP 100 * FROM Parcs_Locations
            ORDER BY LOCATION_ID
        `);
        res.json({
            message: 'Locations data retrieved successfully',
            data: Locations.recordset
        });
    } catch (error) {
        console.error('❌ Error retrieving locations data:', error);
        res.status(500).json({
            error: 'Failed to retrieve locations data',
            details: error.message
        });
        return;
    } finally {
        await sql.close();
    }
});

router.get('/members', async (req, res) => {
    try {
        await sql.connect(config);
        const Members = await sql.query(`
            SELECT TOP 100 * FROM Members
            WHERE firstName IS NOT NULL AND lastName IS NOT NULL
            AND subscriptionId LIKE '1229388'
            ORDER BY id
        `);
        res.json({
            message: 'Members data retrieved successfully',
            data: Members.recordset
        });
    } catch (error) {
        console.error('❌ Error retrieving members data:', error);
        res.status(500).json({
            error: 'Failed to retrieve members data',
            details: error.message
        });
        return;
    } finally {
        await sql.close();
    }
});

router.get('/debug-locations', async (req, res) => {
    try {
        await sql.connect(config);
        
        // Check for bad LOCATION_CODE values
        const badData = await sql.query(`
            SELECT LOCATION_CODE, LOCATION_ID, COUNT(*) as count
            FROM Parcs_Locations 
            WHERE LOCATION_CODE IS NOT NULL
            AND TRY_CAST(LOCATION_CODE AS INT) IS NULL
            GROUP BY LOCATION_CODE, LOCATION_ID
            ORDER BY count DESC
        `);
        
        res.json({
            message: 'Bad LOCATION_CODE data found',
            badValues: badData.recordset
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await sql.close();
    }
});

router.get('/databaseOnlyContacts', async (req, res) => {
    try {
        await sql.connect(config);
        
        // Check for bad LOCATION_CODE values
        const badData = await sql.query(`
            SELECT LOCATION_CODE, LOCATION_ID, COUNT(*) as count
            FROM Parcs_Locations 
            WHERE LOCATION_CODE IS NOT NULL
            AND TRY_CAST(LOCATION_CODE AS INT) IS NULL
            GROUP BY LOCATION_CODE, LOCATION_ID
            ORDER BY count DESC
        `);
        
        res.json({
            message: 'Bad LOCATION_CODE data found',
            badValues: badData.recordset
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        await sql.close();
    }
});

module.exports = router;