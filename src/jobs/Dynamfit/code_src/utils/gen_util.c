/*************************************************************************************

	GEN_UTIL.C

	This file contains general utilities used in the Northwestern Physical Aging
	Codes.  Most of these algorithms are original. These codes have been extended to
	use integer declaration intL, which should in general be defined as "long int", but
	it can be changed to be "int" for necessary reasons.  Whichever choice should be 
	reflected in all future codes to avoid upper counter limits.

	Roger Bradshaw, Northwestern University / University of Washington

	First Written: 8 Jan 1998
	Updated: 12 Jan 1998					To expand weighting std_dev routines

*************************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <curses.h>
//#include <conio.h>
#include <ctype.h>
#include "gen_util.h"
#include "baseutil.h"
#include "base_io.h"
#include "vesolver.h"

#define intL long int				// Use either "int" or "long int"
#define Message_Length 1000		// Length of message character vector

/*************************************************************************************

	This routine is passed a time vector t and a step vector steps. It returns a vector
	stepcount such that stepcount [i] is the number of points in t that are located 
	between steps [i] and steps [i+1]. The code uses NumPts and NumSteps to know the 
	length of t and steps, respectively.
	
	Flag lets the code know whether the counting should permit values beyond
	steps [NumSteps-1]. If Flag = 0, an error will be returned if data exists beyond
	this value (ie there exists t [i] > steps [NumSteps-1]). If Flag = 1, no such error
	will occur and stepcount [NumSteps-1] is the number of points that lie beyond
	steps [NumSteps-1].
	
	The data is assumed to be ever-increasing. This condition is not checked here.
	
	Roger Bradshaw, Northwestern University
	Completed: 8 Jan 1998 (verified correct)

*************************************************************************************/

void count_step_points (double *t, intL NumPts, double *steps, intL NumSteps,
								intL *stepcount, intL Flag)
{
	intL i, j, count;

	if (t [0] < steps [0])
		nrerror ("\nFirst Data Point Value Must Be Greater Than Or Equal To First Step "
					"Value\nIn count_step_points\n");

	count = 0;
	for (i = 0 ; i < NumSteps-1 ; i++) {								// Loop over steps
		j = 0;
		while ((t [count + j] < steps [i + 1]) && (count + j < NumPts))
			j++;		
		stepcount [i] = j;
		count += j;
	}

	stepcount [NumSteps - 1] = NumPts - count;

	if ((stepcount [NumSteps - 1] != 0) && (Flag == 0))		// Points beyond end
		nrerror ("\nEvaluation In count_step_points Beyond Last Step Value\n");

	return;
}

/***************************************************************************************

	weight_std_dev_by_num_pts: Adjusts standard deviations using load points per segment

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine weights the standard deviation to account for different numbers of data
	points in various load segments during multistep load fitting (ie, the strain 
	response for load/unload data).  Prior to entering this routine, the data points
	(tD, yD) are placed into t, y and the standard deviation vector std_dev is set to an
	appropriate value (data or some other form).
	
	This routine counts how many points are in each segment. The weighting factor is
	then set to the average number of points per segment divided by the number of points
	in the segment under consideration. If there are the same number of points in all
	segments, the weight vector w is unity. This routine then calls scale_std_dev to
	apply the weighting.

	This routine assumes that there is a dummy step beyond the last time point.  If this
	condition is violated, this routine will exit in error.

	Roger Bradshaw, Northwestern University
	Code Completed: Summer 1996
	Updated: 21 April 1997	To account for dummy step
	Updated: 8 Jan 1998		General overhaul, moved to GEN_UTIL from VESOLVER (verified)
	Updated: 12 Jan 1998		Changed to call scale_std_dev

***************************************************************************************/

void weight_std_dev_by_num_pts (intL NumPts, double *t, double *std_dev,
										  intL NumSteps, double *steps)
{
	intL i, *stepcount;
	double avg_step, *w;

	stepcount = ivector (0, NumSteps-1);
	w = dvector (0, NumSteps-1);

	if (NumSteps <= 1)
		nrerror ("\nNumber of steps must be 2 or more for weight_std_dev_by_num_pts\n");

	count_step_points (t, NumPts, steps, NumSteps, stepcount, 0);
	
	avg_step = NumPts / (NumSteps - 1.);		// Last step is not real so subtract

	for (i = 0 ; i < NumSteps-1 ; i++) {		// Loop over steps to set weight factor
		if (stepcount [i] > 0)
			w [i] = avg_step / stepcount [i];	// Weighting vector
		else
			w [i] = 1.;									// Will not be used since no points
	}

	scale_std_dev (NumPts, t, std_dev, NumSteps, stepcount, w);

	free_ivector (stepcount, 0);
	free_dvector (w, 0);

	return;
}														 // End Of Routine [weight_standard_deviation]

/***************************************************************************************

	weight_std_dev_by_load_mag: Adjusts standard deviations for load magnitude

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine assigns a weighting factor based on the load value during the step. It
	varies linearly from a value of p at the maximum load to a value of 2-p at the
	minimum load, where p is between 0 and 2 exclusive. If p = 1, there is no weighting
	due to the load factor. The actual scaling is done by scale_std_dev.

	Since it works between max. and min. loads, this weighting algorithm is good for
	both creep and relaxation type approaches.
	
	Roger Bradshaw, Northwestern University
	Code Completed: 12 Jan 1998
	Code Updated: 16 Feb 1998	Changed to p as in CTD paper and used max/min loading
  
***************************************************************************************/

void weight_std_dev_by_load_mag (intL NumPts, double *t, double *std_dev, intL NumSteps,
											double *steps, double *load, double p)
{
	intL i, *stepcount;
	double *w, loadmax, loadmin;

	if (NumSteps <= 1)
		nrerror ("\nNumber of steps must be 2 or more for weight_std_dev_by_load_mag\n");

	stepcount = ivector (0, NumSteps-1);			// Declare num pts per step and w
	w = dvector (0, NumSteps);

	loadmax = load [0];									// Find load max and min values
	loadmin = load [0];									
	for (i = 1 ; i < NumSteps - 1 ; i++) {			
		if (loadmax < fabs (load [i]))				// New max value
			loadmax = fabs (load [i]);
		if (loadmin > fabs (load [i]))				// New min value
			loadmin = fabs (load [i]);
	}
		
	if (loadmax == loadmin)
		nrerror ("\nLoad vector cannot be constant in weight_std_dev_by_load_mag\n");

	for (i = 0 ; i < NumSteps - 1 ; i++)	// Create w using linear function of load
//		w [i] = Linear_Interpolation (load [i], loadmin, 2. - p, loadmax, p);

	count_step_points (t, NumPts, steps, NumSteps, stepcount, 0);
	scale_std_dev (NumPts, t, std_dev, NumSteps, stepcount, w);

	free_ivector (stepcount, 0);
	free_dvector (w, 0);

	return;
}													  // End Of Routine [weight_std_dev_by_load_mag]

/***************************************************************************************

	scale_std_dev: Adjusts standard deviations by groups

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine begins with t-y-std data that is a collection of NumSteps-1 groups of
	data. This routine weights the data in an appropriate fashion using the weight vector
	w to scale the standard deviation of each group. It is assumed that the groups are
	broken up in time (ie, Group 1 is data satisfying steps [0] < t [j] < steps [1]).
	
	The weighting of the standard deviation vector of each group is given by

		std [j] /= sqrt (w [i-1])

	where the jth data point belongs to group i = 1, 2, ... , NumSteps. Note that this
	weighting is destructive to the original std.

	Two common weights are used. The first corrects for the number of data points (w is
	set by weight_std_dev_by_num_pts) and the second corrects for the load importance
	(w is set by weight_std_dev_by_load_mag). Each of these has already counted the
	number of data points in each group - this is passed to this routine as stepcount.

	Roger Bradshaw, Northwestern University
	Code Completed: 12 Jan 1998
	Code Updated: 16 Feb 1998	Replaced lower limit of w with nerror message if w = 0
	Code Updated: 25 May 1998	Removed *steps from function pass list - unnecessary
	
***************************************************************************************/

void scale_std_dev (intL NumPts, double *t, double *std_dev,
						  intL NumSteps, intL *stepcount, double *w)
{
	intL i, j, count;

	count = 0;														// Adjust standard deviations
	for (i = 0 ; i < NumSteps-1 ; i++) {					// Loop over steps
		for (j = 0 ; j < stepcount [i] ; j++) {			// Loop over data in step
			if (fabs (w [i]) != 0.)								// Use w as is if non-zero
				std_dev [count + j] /= sqrt (fabs (w [i]));
			else														// Prevent overflow for w = 0
				nrerror ("\nWeight factor is 0 in scale_std_dev which is unacceptable"				
							" - correct\n");
		}
		count += stepcount [i];									// Increase counter
	}

	return;
}																		// End Of Routine [scale_std_dev]


/***************************************************************************************

	Linear_Interpolation: Returns a linearly interpolated value

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine calculates the linearly interpolated value (t, f) between the known
	values (t1, f1) and (t2, f2)

	Roger Bradshaw, Northwestern University
	Completed: 14 Feb 1997

***************************************************************************************/

double Linear_Interpolation (double t, double t1, double f1, double t2, double f2)
{
	double f;

	if (t2 == t1)
		nrerror ("\nDefintion Time Points Must Be Different In Linear_Interpolation\n");

	f =  (t2 - t) / (t2 - t1) * f1;
	f += (t - t1) / (t2 - t1) * f2;

	return f;
}

/***************************  End Of GEN_UTIL.C  **************************************/
