import { getDb } from '../db/index.js';
import { ObjectId } from 'mongodb';
import AppError from '../utils/AppError.js';

const formatMinistryTeamForClient = (team) => {
    if (!team) return null;
    const { _id, ...rest } = team;
    return {
        _id: _id.toHexString(),
        ...rest
    };
};

export const getPublicMinistryTeams = async (req, res, next) => {
    try {
        const db = getDb();
        console.log('Fetching public ministry teams...');
        const teams = await db.collection('ministry_teams')
            .find({ isActive: true })
            .sort({ name: 1 })
            .toArray();
        console.log(`Found ${teams.length} active ministry teams`);
        res.status(200).json(teams.map(formatMinistryTeamForClient));
    } catch (error) {
        console.error('Error fetching public ministry teams:', error);
        next(new AppError(`Failed to fetch ministry teams: ${error.message}`, 500));
    }
};
export const getAllMinistryTeams = async (req, res, next) => {
    try {
        const db = getDb();
        console.log('Fetching all ministry teams for admin...');
        const teams = await db.collection('ministry_teams')
            .find({})
            .sort({ name: 1 })
            .toArray();
        console.log(`Found ${teams.length} total ministry teams`);
        res.status(200).json(teams.map(formatMinistryTeamForClient));
    } catch (error) {
        console.error('Error fetching all ministry teams:', error);
        next(new AppError(`Failed to fetch all ministry teams: ${error.message}`, 500));
    }
};

export const createMinistryTeam = async (req, res, next) => {
    try {
        const db = getDb();
        const { name, description, leaderName, contactEmail, imageUrl } = req.body;

        // More flexible validation - only require name and description as essentials
        if (!name || !description) {
            return next(new AppError('Name and description are required.', 400));
        }

        const newTeam = {
            name,
            description,
            leaderName: leaderName || '',
            contactEmail: contactEmail || '',
            imageUrl: imageUrl || null,
            isActive: true,
            createdAt: new Date().toISOString(),
        };

        console.log('Creating ministry team with data:', newTeam);
        
        const result = await db.collection('ministry_teams').insertOne(newTeam);
        const createdTeam = { ...newTeam, _id: result.insertedId };
        
        console.log('Ministry team created successfully:', createdTeam);
        res.status(201).json(formatMinistryTeamForClient(createdTeam));
    } catch (error) {
        console.error('Error creating ministry team:', error);
        next(new AppError(`Failed to create ministry team: ${error.message}`, 500));
    }
};

export const updateMinistryTeam = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, description, leaderName, contactEmail, imageUrl, isActive } = req.body;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid ministry team ID.', 400));
        }

        const db = getDb();
        const updatedFields = { 
            name, 
            description, 
            leaderName: leaderName || '', 
            contactEmail: contactEmail || '', 
            imageUrl: imageUrl || null, 
            isActive: isActive !== undefined ? isActive : true 
        };

        console.log('Updating ministry team with ID:', id, 'Data:', updatedFields);

        const result = await db.collection('ministry_teams').updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedFields }
        );

        if (result.matchedCount === 0) {
            return next(new AppError('Ministry team not found.', 404));
        }

        const updatedTeam = await db.collection('ministry_teams').findOne({ _id: new ObjectId(id) });
        console.log('Ministry team updated successfully:', updatedTeam);
        res.status(200).json(formatMinistryTeamForClient(updatedTeam));
    } catch (error) {
        console.error('Error updating ministry team:', error);
        next(new AppError(`Failed to update ministry team: ${error.message}`, 500));
    }
};

export const deleteMinistryTeam = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            return next(new AppError('Invalid ministry team ID.', 400));
        }

        console.log('Deleting ministry team with ID:', id);
        const db = getDb();
        const result = await db.collection('ministry_teams').deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return next(new AppError('Ministry team not found.', 404));
        }

        console.log('Ministry team deleted successfully');
        res.status(200).json({ message: 'Ministry team deleted successfully.' });
    } catch (error) {
        console.error('Error deleting ministry team:', error);
        next(new AppError(`Failed to delete ministry team: ${error.message}`, 500));
    }
};