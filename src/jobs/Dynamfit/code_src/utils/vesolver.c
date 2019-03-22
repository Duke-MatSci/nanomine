/***************************************************************************************

	VESOLVER.C

	This file contains numerical routines for solving problems referring specifically
	to the area of linear viscoelasticity.  This file needs to be included in all
	Northwestern Physical Aging Codes.  These codes have been extended to only use intL
	as integer declarations.  This in general should be long integers - this change
	should be reflected in all future codes to avoid upper counter limits.

	NOTE: Many former codes in this file have been moved to VE_DEAD.C since they are
			no longer used (for many reasons...)

	Roger Bradshaw
	Northwestern University
	First Written: 16 September 1996
	Individual Codes Written As Listed

***************************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <curses.h>
//#include <conio.h>
#include "vesolver.h"
#include "baseutil.h"
#include "gen_util.h"
#include "solvers.h"

#define intL long int

#pragma warning ( disable : 4244)  // Disable double to long conversion warning

/***************************************************************************************

	Taylor_Method:	1-D Convolution Integral Solution Using Taylor Method Algorithm

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	The Taylor method is then used to solve the convolution integral of the form

		f(t) = Y(0) X(t) + Integral Over [0+, t] Of X (t - z) * [dY(z) / dz] dz

	where X is a modulus type Prony series, Y is a forcing function, and f is the
	response function.

	Prony Series (X)
	~~~~~~~~~~~~~~~~

	This routine is given a Prony series describing material response X of the form:

		X(t) = X [0] + Sum k Over [1, NumElems-1] Of X [k] * Base_Function (t)

		NumElems = Number of Prony series elements
		X = Coefficients Of Prony Series
		Tau = Relaxation Times Of Prony Series

	If CompMod = 1 (compliance type Prony series function)
  
		Base (t) = 1. - exp (-t / Tau [k])

	If CompMod = 2 (modulus type Prony series function)
	
		Base (t) = exp (-t / Tau [k])

	This is passed as X_Orig. A copy is made into X (used for solution) at which time
	compliance type functions are converted to modulus type by addition and subtraction.

	Driving Function (Y) And Response Function (f)
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	The forcing function Y(t) and the response function f(t) are defined at NumPts time
	points (given by the time vector t) the first of which must be 0. The function Y is
	assumed to be piecewise linear while f is defined pointwise.

 		NumPts = Number of points in t, Y, f
		t = Times Points For Segments Of Y and f (t [0] must be zero)
		Y = Piecewise Linear Values Defining Forcing Function (Y [0] can be anything)
		f = Pointwise Values Defining Response Function (f [0] can be anything)

	NOTE: If Y(0) is non-zero, this solution is different than simply finding X Conv dY/dt
	since a step at time 0 is assumed to exist (this caused me some time when verifying
	that the code worked - account for it!).

	Whether Y or f is solved for is determined by Solve_Y_f

		Solve_Y_f = 1		Solve for f
		Solve_Y_f = 2		Solve for Y

	Whether printouts of the solution status are given depends on print_status

		print_status = 0		No intermediate printouts
		print_status = N		Printout out status every Nth solution step
	  
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	Roger Bradshaw, Northwestern University
	Finalized: December 11, 1995

	Updated: 23 April 1996  To Improve Documentation, Create Single Code

	Updated: 15 Feb 1997		Improve Documentation, Changed G to X for clarity, Changed
									NumElems to standard approach (ie, NumElems elements means
									limit NumElems-1), added compliance type functionality

	Updated: 12 June 1997	Fixed minor error in calculation of g_new in first step
   								(intended Lambda_i but had written Lambda_1) 

	Updated: 9 May 1998		Changed names to current style. Broke out the flags so they
									are direct (no longer use signs to find out flags). Use the
									Taylor_Coeffs routine to do the calculations. Completely
									revamped the notes above. Changed definition of NumPts to
									current approach. Changed call name - see note below

	To fix calls that show up as incorrect, change them as below:
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	OLD WAY:
	Taylor_1D (NumElems, X_Orig, Tau, NumPts-1, Y, f, t)

	NEW WAY (Note that NumPts increases by 1):
	Taylor_Method (NumElems, Tau, X_Orig, NumPts,
						t, Y, f, CompMod, Solve_Y_f, print_status)

***************************************************************************************/

void Taylor_Method (intL NumElems, double *Tau, double *X_Orig, 
						  intL NumPts, double *t, double *Y, double *f,
		 				  intL CompMod, intL Solve_Y_f, intL print_status)
{
	int i;
	double *g_old, *h_old, dt, *X, Mu, Omega, Y_old, Y_old_2;

// Convert X_Orig to modulus style Prony series for use below

	X = dvector (0, NumElems-1);
	for (i = 0 ; i < NumElems ; i++)
		X [i] = X_Orig [i];

	if (CompMod == 1)		// Change X only if compliance type - make it modulus type
		for (i = 1 ; i < NumElems ; i++) {
			X [0] += X [i];
			X [i] *= -1.;
		}

// Setup vectors for Taylor_Coeffs solution

	g_old = dvector (0, NumElems-1);
	h_old = dvector (0, NumElems-1);

// First step initializes terms

	dt = 0.;
	Y_old = 0.;
	Y_old_2 = 0.;

	Taylor_Coeffs (dt, &Mu, &Omega, NumElems, X, Tau, Y_old, Y_old_2, g_old, h_old);

	if (Solve_Y_f == 1)								// Solve for f given Y
		f [0] = Mu * Y [0] + Omega;
	else													// Solve for Y given f
		Y [0] = (f [0] - Omega) / Mu;

// Loop over all of the steps

	for (i = 1 ; i < NumPts ; i++) {

		if (print_status > 0)										// Intermediate print requested
			if ((i+1)%print_status == 0 || i == NumPts-1)	// Print every print_status step
				printf ("\rSolving At Point %d", i+1);

		dt = t [i] - t [i-1];						// Setup for this solution step
		if (dt <= 0.)
			nrerror ("Data time points do not increase in Taylor_Method - correct");
		Y_old_2 = Y_old;
		Y_old = Y [i-1];

		Taylor_Coeffs (dt, &Mu, &Omega, NumElems, X, Tau, Y_old, Y_old_2, g_old, h_old);

		if (Solve_Y_f == 1)							// Solve for f given Y
			f [i] = Mu * (Y [i] - Y [i-1]) + Omega;
		else												// Solve for Y given f
			Y [i] = (f [i] - Omega) / Mu + Y [i-1];
	}

	if (print_status > 0)
		printf ("\n");

	free_dvector (g_old, 0);
	free_dvector (h_old, 0);
	free_dvector (X, 0);

	return;
}    																		  // End Of Routine [Taylor_1D]

/***************************************************************************************

	Taylor_Coeffs:	Calculates Solution Coefficients For 1-D Taylor Algorithm

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	The Taylor method is used to solve a convolution integral of the form:

		f(t) = Y(0) X(t) + Integral Over [0+, t] Of X (t - z) * [dY(z) / dz] dz

	where X is given as a Prony series of P elements of the form

		X(t) = X [0] + Sum p Over [1, P-1] Of X [p] * exp (-t / Tau [p])

		P = Number of Prony series elements
		X = Coefficients Of Prony Series
		Tau = Relaxation Times Of Prony Series

	and Y is piecewise linear.  The solution for the qth data point is found by the
	algebraic equation:

		Mu * (Y_q - Y_q-1) + Omega = f_q

	where

		Mu = X_0 + Sum p (X_p * h_p_q)

		Omega = X_0 * Y_q-1 + Sum p (g_p_q)

		h_p_q = Tau_p / dt_q * [1 - exp (-dt_q / Tau_p)]

			* except h_p_0 = 1

		g_p_q = [g_p_q-1 + X_p * h_p_q-1 * (Y_q-1 - Y_q-2)] * exp (-dt_q / Tau_p)

			* except g_p_0 = 0

		and for q = 1, Y_old_2 = 0 and Y_old = Y(0)

	Hence, Mu and Omega can be calculated from knowledge of

		X
		Tau
		dt_q 						Call this dt
		Y_q-2						Y_old_2
		Y_q-1                Y_old
		h_old
		g_old

	The solution for the current step is then obtained as the terms Mu and Omega.  The
	g_old and h_old that are passed are replaced with the new values for g and h (which
	will be the old values for the next solution step).  If the old values are not to be
	destroyed, they must be backed up prior to entering this routine.

	This routine initializes itself for the first step.  For this first step, simply pass
	dt = 0 and all terms will be initialized appropriately.  In the first step, the
	values Y_old and Y_old_2 are inconsequential (set to zero for consistency).

	Hence, outside of this routine, the only change from solution step to solution step
	that needs to be made is the change in dt, Y_old, and Y_old_2.

	Roger Bradshaw, Northwestern University
	Finalized: 12 June 1997

***************************************************************************************/

void Taylor_Coeffs (double dt, double *Mu, double *Omega,
						  intL P, double *X, double *Tau,
						  double Y_old, double Y_old_2, double *g_old, double *h_old)
{
	int p;
	double mult;

	if (dt == 0.) {														// Initialize this solver
		*Mu = 0.;
		for (p = 0 ; p < P ; p++) {
			g_old [p] = 0.;												// Set g_p_0 = 0
			h_old [p] = 1.;												// Set h_p_0 = 1
			*Mu += X [p];													// Mu is simply X at t=0
		}
		*Omega = 0.;														// Omega is 0
	}

	else {																	// Otherwise update solution
		for (p = 1 ; p < P ; p++) {                           // First update g and h
			mult = exp (-dt / Tau [p]);                       	// Common multiplier term

			g_old [p] += X [p] * h_old [p] * (Y_old - Y_old_2);
			g_old [p] *= mult;											// g_old is now g_new

			h_old [p] = Tau [p] / dt * (1. - mult);				// h_old is now h_new
		}

		*Mu = X [0];														// Initialize Mu and Omega
		*Omega = X [0] * Y_old;

		for (p = 1 ; p < P ; p++) {                           // Now finalize Mu and Omega
			*Mu += X [p] * h_old [p];
			*Omega += g_old [p];
		}
	}

	return;
}    																	 // End Of Routine [Taylor_Coeffs]

/***************************************************************************************

	Taylor_2D:	2-D Stress/Strain Response Routine Using Taylor Algorithm

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine is given a Prony series describing material response K of the form:

		K_ij(t) = K [i][j][0] + Sum k Over [1, P-1] Of K [i][j][k] * Base_Function_k (t)

		P = Number of Prony series elements
		K = Coefficients Of Prony Series

	If P is positive, a modulus type function is being passed so:

		Base_Function_k (t) = exp (-t / Tau [k])

	If P is negative, a compliance type function is being passed so set P = -P and:

		Base_Function_k (t) = 1. - exp (-t / Tau [k])

	where Tau = Relaxation Times Of Prony Series (same for all values i,j for K_ij)

	The material is being driven by forcing function u_i(t) and has a response function
	f_i(t).  The functions u_i and f_i are given as N points (related to time vector tD)
	and are assumed piecewise linear in between.

		N = (+/-) Number Of Continuous Piecewise Linear Segements Defining Both f and u
		u = Piecewise Linear Values Defining Strain (u [0] defined to be zero)
		f = Piecewise Linear Values Defining Stress (f [0] defined to be zero)
		tD = Times Points For Segments Of u and f (tD [0] defined to be zero)

	The governing equation is an OrderxOrder system of convolution integrals of the form:

		f_i(t) = Sum Over j Of Integral [0, t] Of K_ij (t - z) * [du_j(z) / dz] dz

		i, j = 1 .. Order
		If N is positive, solve for f_i (flag = 0) given K and u.
		If N is negative, solve for u_i (flag = 1) given K and f.

	Note that u_i and f_i may take on non-zero values at time zero.  This requires a
	step function at t = 0.  Since this step requires 0 time to occur, the response will
	only involve the elastic portion of G (ie sum all coefficients).  Additional steps
	could also be accounted for, but are not included (for simplicity issues) in this
	code.  It is easy enough to get around this limitation by allowing any step to ramp
	over a very short time between two time points.

	The solution to this MxM system is described in the composites paper [Bradshaw and
	Brinson, 1997].  Note the way that each of these terms are set up:

		K [i][j][k]		i, j =	[0, Order-1]		k = [0, P-1]
		u [i][j]       i = 		[0, Order-1]  		j = [0, P-1]
		f [i][j]       i = 		[0, Order-1]  		j = [0, P-1]
		g [i][j][k]		i, j = 	[0, Order-1]		k = [0, P-1]
		h [i]       	i = 		[0, P-1]
		Nu [i][j]    	i, j = 	[0, Order-1]
		s [i]		      i = 		[0, Order-1]

	Roger Bradshaw, Northwestern University
	Finalized: 19 March 1997

***************************************************************************************/

void Taylor_2D (intL Order, intL P, double ***K_Orig, double *Tau,
					 intL N, double **u, double **f, double *tD)
{
	int i, j, k, q, flag, print_status, compliance;
	double ***g_new, ***g_old, *h_new, *h_old, dt, ***K, **Nu, *s;
	double **A, *x, *b;

// Convert K_Orig to modulus style Prony series for use below

	compliance = 0;			// Modulus type = 0
	if (P < 0) {
		compliance = 1;		// Compliance type = 1
		P *= -1;
	}

	K = d3tensor (0, Order-1, 0, Order-1, 0, P-1);

	for (i = 0 ; i < Order ; i++)
		for (j = 0 ; j < Order ; j++)
			for (k = 0 ; k < P ; k++)
				K [i][j][k] = K_Orig [i][j][k];

	if (compliance == 1)		// Change K only if compliance type - make it modulus type
		for (i = 0 ; i < Order ; i++)
			for (j = 0 ; j < Order ; j++)
				for (k = 1 ; k < P ; k++) {
					K [i][j][0] += K [i][j][k];
					K [i][j][k] *= -1.;
				}

// Now K is a modulus type function - check that time value is zero at first step

	if (tD [0] != 0.)
		nrerror ("\nFirst time data point must be 0 in Taylor_2D\n");

// Initialize remaining memory required for solution

	g_new = d3tensor (0, Order-1, 0, Order-1, 0, P-1);	// For Taylor's method
	g_old = d3tensor (0, Order-1, 0, Order-1, 0, P-1);
	h_new = dvector (0, P-1);
	h_old = dvector (0, P-1);

	Nu = dmatrix (0, Order-1, 0, Order-1);		// For solving the composites problem
	s = dvector (0, Order-1);

	A = dmatrix (0, Order-1, 0, Order-1);		// For solving the matrix equation
	x = dvector (0, Order-1);
	b = dvector (0, Order-1);

	print_status = 1;				// Want to disable for some cases (0=enable, 1=disable)

// See whether to solve for f (flag = 0) or u (flag = 1) and fix N accordingly

	if (N > 0)
		flag = 0;
	else {
		flag = 1;
		N *= -1;
	}

// Solve for elastic response at time zero

	for (i = 0 ; i < Order ; i++)
		for (j = 0 ; j < Order ; j++) {
			A [i][j] = 0.;
			for (k = 0 ; k < P ; k++)
				A [i][j] += K [i][j][k]; 		// A contains K_ij (0)
		}

	if (flag == 0)									// Simply take A * u [0]
		for (i = 0 ; i < Order ; i++) {
			f [i][0] = 0.;
			for (j = 0 ; j < Order ; j++)
				f [i][0] += A [i][j] * u [j][0];
		}

	else {
		for (i = 0 ; i < Order ; i++)
			b [i] = f [i][0];
		Gauss_Jordan (Order, A, x, b);
		for (i = 0 ; i < Order ; i++)
			u [i][0] = x [i];
	}

// Initialize g, h for remaining solution

	for (i = 0 ; i < Order ; i++)
		for (j = 0 ; j < Order ; j++)
			for (k = 0 ; k < P ; k++) {
				g_new [i][j][k] = 0.;
				g_old [i][j][k] = 0.;
			}

	for (i = 0 ; i < P ; i++) {
		h_new [i] = 0.;
		h_old [i] = 0.;
	}

// Loop over all of the steps

	for (q = 1 ; q <= N ; q++) {

		if (print_status == 0)
			printf ("\rSolving For Step %d", q);

		dt = tD [q] - tD [q-1];

// First, move old h terms and solve for new ones

		for (k = 1 ; k < P ; k++) {  		// Move to old terms and solve for new h terms
			h_old [k] = h_new [k];
			h_new [k] = Tau [k] / dt * (1. - exp (-dt / Tau [k]));
		}

// Second, move old g terms and solve for new ones

		for (i = 0 ; i < Order ; i++)    // Move to old terms and solve for new g terms
			for (j = 0 ; j < Order ; j++)
				for (k = 1 ; k < P ; k++) {
					g_old [i][j][k] = g_new [i][j][k];
					if (q == 1)
						g_new [i][j][k] = u [j][0] * K [i][j][k] * exp (-tD [1] / Tau [k]);
					else {
						g_new [i][j][k] =  g_old [i][j][k];
						g_new [i][j][k] += K [i][j][k] * h_old [k] * (u[j][q-1] - u[j][q-2]);
						g_new [i][j][k] *= exp (-dt / Tau [k]);
					}
				}

// Now construct Nu matrix and s vector

		for (i = 0 ; i < Order ; i++)
			for (j = 0 ; j < Order ; j++) {
				Nu [i][j] = K [i][j][0];
				for (k = 1 ; k < P ; k++)
					Nu [i][j] += K [i][j][k] * h_new [k];
			}

		for (i = 0 ; i < Order ; i++) {
			s [i] = 0.;
			for (j = 0 ; j < Order ; j++) {
				s [i] += K [i][j][0] * u [j][q-1];
				for (k = 1 ; k < P ; k++)
					s [i] += g_new [i][j][k];
			}
		}

// Now we are ready for solution

		if (flag == 0) 												// Solve for f by simple eval
			for (i = 0 ; i < Order ; i++) {
				f [i][q] = s [i];
				for (j = 0 ; j < Order ; j++)
					f [i][q] += Nu [i][j] * (u [j][q] - u [j][q-1]);
			}

		else {                                             // Solve matrix equation for u
			for (i = 0 ; i < Order ; i++)
				b [i] = f [i][q] - s [i];
			Gauss_Jordan (Order, Nu, x, b);
			for (i = 0 ; i < Order ; i++)
				u [i][q] = u [i][q-1] + x [i];
		}
	}

	if (print_status == 0)
		printf ("\n");

	free_d3tensor (K, 0, Order-1, 0, Order-1, 0);
	free_d3tensor (g_old, 0, Order-1, 0, Order-1, 0);
	free_d3tensor (g_new, 0, Order-1, 0, Order-1, 0);
	free_dvector (h_new, 0);
	free_dvector (h_old, 0);
	free_dmatrix (Nu, 0, Order-1, 0);
	free_dmatrix (A, 0, Order-1, 0);
	free_dvector (s, 0);
	free_dvector (x, 0);
	free_dvector (b, 0);

	return;
}    																		  // End Of Routine [Taylor_2D]

/***************************************************************************************

	Create_Prony_SVD:	Finds Prony series fit of data using SVD (no sign control) method

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine creates a Prony series using SVD instead of the normal equations.  It
	finds a Prony series of the form:

		G (t) = Coeff_0 + Sum i = 1 To NumElems {Coeff_i * exp (-t / Tau_i)}

	The relaxation times (Tau) will be set by this routine to be evenly spaced in log
	time between Tau_Min and Tau_Max.  The data to be fit is given as NumPts data points
	(XD, YD).  The resulting coefficients are returned in Coeff, and the RMS percent
	error of the fit to the data is returned in RMS.

	Note that the form above is that for modulus.  Since this routine does not enforce
	sign control, there is no reason to use a different form for compliance.  If desired,
	this can be done by the user outside of this routine.

	This routine checks that there is at least one data point for which XD / 10 < Tau_Min
	If this condition is not met, the program exits with error.  This is because the
	resulting Prony series fit for all data points will be insensitive to the choice for
	Coeff [1].  This is equivalent to saying Gamma <= 10 (using my notation for Gamma).

	Roger Bradshaw, Northwestern University
	Originally Written: November 1996
	Modified: 15 Feb 1997
	Modified: 24 May 1998		Changed standard deviation to unity term (unless RMS = -1
										in which case old approach is used). Also added RMS_Mult to
										multiply RMS by 1 if unity and 100 (for %) if data std_dev

***************************************************************************************/

void Create_Prony_SVD (intL NumPts, double *XD, double *YD, intL NumElems,
							  double Tau_Min, double Tau_Max, double *Coeff, double *Tau,
							  double *RMS)
{
	intL i;
	double *CoeffAll, value, Gamma_Value, *std_dev, RMS_Mult;

// Check that Tau_Min is not too small as to make Coeff_1 irrelevant to solution

	Gamma_Value = 1000.;
	std_dev = dvector (0, NumPts-1);
	RMS_Mult = 1.;
	for (i = 0 ; i < NumPts ; i++) {
		if (*RMS != -1.)
			std_dev [i] = 1.;
		else {
			std_dev [i] = YD [i];
			RMS_Mult = 100.;
		}

		if (XD [i] / Tau_Min < Gamma_Value)
			Gamma_Value = XD [i] / Tau_Min;
	}
	if (Gamma_Value > 10.)
		nrerror ("\nTau_Min Is Too Small For Data Set In Create_Prony_SVD - Correct\n");

// Create the Tau vector based on Tau_Min, Tau_Max, evenly spaced in log time

	printf ("Prony Series SVD Solution\nInitializing...");

	Tau [0] = pow (10., 50.);
	value = log10 (Tau_Max) - log10 (Tau_Min);
	for (i = 1 ; i < NumElems ; i++)
		Tau [i] = pow (10., log10 (Tau_Min) + value * (i - 1) / (NumElems - 2));

// SVD solver needs function to evaluate the basis functions of the linear fitting
// function.  Do this using Prony_Basis below and solve problem via Coeff_All.  The
// first NumElems terms of CoeffAll represent the solution values from SVDFIT

	CoeffAll = dvector (0, 2 * NumElems - 1);
	for (i = 0 ; i < NumElems ; i++)
		CoeffAll [NumElems + i] = Tau [i];

// Now we have the data points, the relaxation times - solve using svdfit

	svdfit (XD, YD, std_dev, NumPts, CoeffAll, NumElems, RMS, Create_Prony_SVD_Basis);
	printf ("Done\n");

// Solve for the RMS % error

	*RMS /= NumPts;
	*RMS = RMS_Mult * sqrt (*RMS);  // Convert it to RMS % error

// Move coefficients to proper locations

	for (i = 0 ; i < NumElems ; i++)
		Coeff [i] = CoeffAll [i];

	free_dvector (CoeffAll, 0);

	return;
}																	 // End Of Routine [Create_Prony_SVD}


/***************************************************************************************

	Create_Prony_SVD_Basis:	Basis functions for Create_Prony_SVD

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine calculates the basis functions for a standard (modulus) Prony series

		CoeffTau [0 - NumElems-1] = Coeffs (solved for elsewhere)
		CoeffTau [NumElems - 2*NumElems-1] = Taus

	Roger Bradshaw, Northwestern University
	Code Completed: 14 Feb 1997

***************************************************************************************/

void Create_Prony_SVD_Basis (double t, double *basis, double *CoeffTau, intL NumElems)
{
	intL i;

	basis [0] = 1.;
	for (i = 1 ; i < NumElems ; i++)
		basis [i] = exp (- t / CoeffTau [NumElems + i]);

	return;
}															 // End Of Routine [Create_Prony_SVD_Basis]


/***************************************************************************************

	Invert_Prony_SVD:	Finds Prony series inverse using SVD (no sign control) method

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine finds the Prony series Y (t) which satisfies the convolution
	integral equation:

		f(t) = Integral from 0 to t of {X(t - xi) Y (xi) dxi}

	where X(t) and Y(t) are given as Prony series of the form:

		X(t) = X0 + Sum i = [0, NumX-1]  X_i * exp (-t / Tau [i])
		Y(t) = Y0 + Sum j = [0, NumY-1]  Y_j * exp (-t / Eta [j])

	and f(t) is given as a series of data points.  This routine does not enforce sign
	control, and therefore uses an SVD solution method.

	The relaxation times (Eta) will be set by this routine to be evenly spaced in log
	time between Eta_Min and Eta_Max.  The data to be fit is given as NumPts data points
	(tD, fD).  The resulting coefficients are returned in Inv, and the RMS percent
	error of the fit to the data is returned in RMS.

	Note that the form above is that for two modulus type functions.  Since this routine
	does not enforce sign control, there is no reason to use a different form for
	compliance.  If desired, this can be done by the user outside of this routine.
	Note that sign control routines are provided below where X is a modulus type Prony
	series and Y is compliance type Prony series, and both are under sign control.

	This routine checks that there is at least one data point for which tD / 10 < Tau_Min
	If this condition is not met, the program exits with error.  This is because the
	resulting Prony series fit for all data points will be insensitive to the choice for
	Y [1].  This is equivalent to saying Gamma <= 10 (using my notation for Gamma).

	Roger Bradshaw, Northwestern University
	Code Completed: 15 Feb 1997
	Code Updated:		24 May 1998		Changed standard deviation to unity (unless RMS is
												-1 in which case data is used). Also corrected RMS
												error to say NumPts instead of NumY. Also added
												RMS_Mult to multiply by 1 if unity at 100 (for %) if
												data for std_dev

***************************************************************************************/

void Invert_Prony_SVD (intL NumPts, double *tD, double *fD, intL NumX,
							  double *X, double *Tau, intL NumY, double *Y, double *Eta,
							  double Eta_Min, double Eta_Max, double *RMS)
{
	intL i;
	double *XYAll, value, Gamma_Value, *std_dev, RMS_Mult;

// Create standard deviation 

	std_dev = dvector (0, NumPts-1);
	RMS_Mult = 1.;
	for (i = 0 ; i < NumPts ; i++) {
		if (*RMS != -1.)
			std_dev [i] = 1.;
		else {
			std_dev [i] = fD [i];
			RMS_Mult = 100.;
		}
	}
	*RMS = 0.;		// Ensures intermediate printouts during SVD solution (-1 to not)

// Check that Eta_Min is not too small as to make Y_1 irrelevant to solution

	Gamma_Value = 1000.;
	for (i = 0 ; i < NumPts ; i++)
		if (tD [i] / Eta_Min < Gamma_Value)
			Gamma_Value = tD [i] / Eta_Min;
	if (Gamma_Value > 10.)
		nrerror ("\nEta_Min Is Too Small For Data Set In Invert_Prony_SVD - Correct\n");

// Create the Eta vector based on Eta_Min, Eta_Max, evenly spaced in log time

	printf ("Prony Series SVD Solution\nInitializing...");

	Eta [0] = pow (10., 50.);
	value = log10 (Eta_Max) - log10 (Eta_Min);
	for (i = 1 ; i < NumY ; i++)
		Eta [i] = pow (10., log10 (Eta_Min) + value * (i - 1) / (NumY - 2));

// SVD solver needs function to evaluate the basis functions of the linear fitting
// function.  Do this using Prony_Basis below and solve problem via Coeff_All.  The
// first NumElems terms of CoeffAll represent the solution values from SVDFIT

	XYAll = dvector (0, 2 * NumY + 2 * NumX);

	for (i = 0 ; i < NumY ; i++) {						// Set Y(t) information
		XYAll [i] = 0.;
		XYAll [NumY + i] = Eta [i];
	}
	XYAll [2 * NumY] = NumX + 0.001;						// Set X(t) information
	for (i = 0 ; i < NumX ; i++) {
		XYAll [2 * NumY + i + 1] = X [i];
		XYAll [2 * NumY + NumX + i + 1] = Tau [i];
	}

// Now we have the data points, the relaxation times - solve using svdfit

	svdfit (tD, fD, std_dev, NumPts, XYAll, NumY, RMS, Invert_Prony_SVD_Basis);
	printf ("Done\n");

// Solve for the RMS % error

	*RMS /= NumPts;
	*RMS = RMS_Mult * sqrt (*RMS);  // Convert it to RMS % error

// Move coefficients to proper locations

	for (i = 0 ; i < NumY ; i++)
		Y [i] = XYAll [i];

	free_dvector (XYAll, 0);

	return;
}																	 // End Of Routine [Invert_Prony_SVD]


/***************************************************************************************

	Invert_Prony_SVD_Basis: Basis Functions Of Convolution Of Two Modulus Prony Series

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	Consider two modulus type Prony series

		X(t) = X0 + Sum i = [0, NumX-1]  X_i * exp (-t / Tau [i])
		Y(t) = Y0 + Sum j = [0, NumY-1]  Y_j * exp (-t / Eta [j])

	The convolution of these two:

		f(t) = Integral from 0 to t of {X(t - xi) Y (xi) dxi}

	can be written as:

		f(t) = Sum Over j in [0, NumY-1]  Y_j * basis_j (t)

	This routine evaluates basis_j (t) when given XYAll as:

		XYAll [0 - NumY-1] = Y_j (solved for elsewhere)
		XYAll [NumY - 2*NumY-1] = Eta_j
		XYAll [2*NumY] = NumX
		XYAll [2*NumY + 1 - 2*NumY + NumX] = X_i
		XYAll [2*NumY + NumX + 1 - 2*NumY + 2*NumX] = Tau_i

	and everything is known except Y_j.

	Roger Bradshaw, Northwestern University
	Code Completed: 16 Feb 1997

***************************************************************************************/

void Invert_Prony_SVD_Basis (double t, double *basis, double *XYAll, intL NumY)
{
	intL i, j, NumX;
	double *X, *Tau, *Eta, *TauExp, *EtaExp, temp, TOL;

// Set tolerance for determining if Tau_i = Eta_j used in this code

	TOL = pow (10., -6.);

// Declare necessary memory and set pointers to simplify work

	NumX = XYAll [2 * NumY];
	TauExp = dvector (0, NumX - 1);
	EtaExp = dvector (0, NumY - 1);

	Eta = &XYAll [NumY];
	X = &XYAll [2 * NumY + 1];
	Tau = &XYAll [2 * NumY + NumX + 1];

// To save computation, fill TauExp_i with exp (- t / Tau_i) and
// EtaExp_j with exp (- t / Eta_j).  The first term is a constant so simply 1.

	TauExp [0] = 1.;
	EtaExp [0] = 1.;
	for (i = 1 ; i < NumX ; i++)
		TauExp [i] = exp (- t / Tau [i]);
	for (i = 1 ; i < NumY ; i++)
		EtaExp [i] = exp (- t / Eta [i]);

// Now set about calculating the basis functions.  The first one is special case

	basis [0] = X [0] * t;
	for (i = 1 ; i < NumX ; i++)
		basis [0] += X [i] * Tau [i] * (1. - TauExp [i]);

// Remaining cases use other summation formula - outer loops over number of basis fns
// Inner does summation loop over elements of X

	for (i = 1 ; i < NumY ; i++) {
		basis [i] = X [0] * Eta [i] * (1. - EtaExp [i]);
		for (j = 1 ; j < NumX ; j++) {
			if (EqualValues (Eta [i], Tau [j], TOL) == 0)
				temp = t * 0.5 * (TauExp [j] + EtaExp [i]);
			else
				temp = Tau [j] * Eta [i] / (Tau [j] - Eta [i]) * (TauExp [j] - EtaExp [i]);
			basis [i] += X [j] * temp;
		}
	}

// Done here so free DMA and return

	free_dvector (TauExp, 0);
	free_dvector (EtaExp, 0);

	return;
}															  //End Of Routine [Invert_Prony_SVD_Basis]

/***************************************************************************************

	EqualValues:	Determines if two values are approximately equal

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine decides if Tau and Eta are equal within the tolerance.  If they are
	it returns 0.  If they are not, it returns some nonzero value (likely 1).

	Roger Bradshaw, Northwestern University
	Code Completed: Summer 1996

***************************************************************************************/

int EqualValues (double Tau, double Eta, double TOL)
{
	double Value1, Value2;

	Value1 = (Tau - Eta) / Eta;
	Value2 = (Eta - Tau) / Tau;

	return (fabs (Value1) > TOL && fabs (Value2) > TOL);
}																			// End Of Routine [EqualValues]

/***************************************************************************************

	Lamina_S2G_SVD: Converts Kohlrausch Lamina Compliance To Prony Series Compl./Modulus

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine takes the information about lamina compliance and finds the lamina
	modulus.  The compliance terms E11 and Nu12 are given by constants, and S22 and S66
	are given by Kohlrausch models.  The Prony series for G11, G12, G22 and G66 are
	found using the uncoupled convolution integral equations and the multidata solution
	method.

	Recall that E11 and Nu12 are related to S11 and S12 by:

		S11 = 1 / E11		S12 = - Nu12 / E11

	This routine fits npts data points evenly spaced in log time between start and end
	times (10^ps and 10^pe).  It then determines the Prony series coefficients and
	relaxation times.  It uses NE Prony series elements (including one constant term)
	and sets the values of Eta evenly spaced in log time between 10^ps / gamma and
	10^pe * gamma.  S(t) and G(t) will be given by:

		S (t) = G0 + Sum i = 1 To NE-1 {S_i * exp (-t / Eta_i)}
		G (t) = G0 + Sum i = 1 To NE-1 {G_i * exp (-t / Eta_i)}

	The coefficients are stored in G as:

	G [0][i] = G11
	G [1][i] = G12
	G [2][i] = G22
	G [3][i] = G66
	Eta [i] = Relaxation times

	This routine does not employ sign control, although it could be modified to do so.
	This is because the Kohlrausch model itself may not be amenable to sign control
	solutions as demonstrated previously.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	NOTE: In the event that S022 is negative, the compliance Prony series are already
	known. In this case, the values are

	S022			Flag only
	Tau22			Start exponent of time data
	Beta22		End exponent of time data

	In this case, the terms Kt is filled with data between start and end time limits.
	From the point at which the S22 and S66 Prony series are determined everything is
	the same.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	Roger Bradshaw
	Northwestern University
	Written: 11 September 1996
	Updated: 17 Feb 1997				Modified documentation, changed to SVD solution
	Updated: 6 Aug 1997				To allow Prony to be passed instead of Kohlrausch

***************************************************************************************/

void Lamina_S2G_SVD (intL npts, intL NE, double ps, double pe, double gamma,
							double *Eta, double **G, double E11, double Nu12,
							double S022, double Tau22, double Beta22, double *S22,
							double S066, double Tau66, double Beta66, double *S66)
{
	int i, use_data;
	double *Kt, *Kc, *Tau, RMS, *GTemp, *S_Twid, tds, tde;

// Now set time varying components S22, S66 - first find the Prony series for them
// Fit using npts data points from 10^ps - 10^pe seconds.  Set relaxation times evenly
// spaced in log time using gamma (these are set in Create_Prony_Series).

	Kt = dvector (0, npts-1);
	Kc = dvector (0, npts-1);
	Tau = dvector (0, NE-1);
	GTemp = dvector (0, NE-1);

	if (S022 > 0.) {										// Use ps and pe as time limits
		use_data = 0;
		for (i = 0 ; i < npts ; i++)
			Kt [i] = pow (10., ps + (pe - ps) * i / (npts - 1));
	}

	else {                                      	// Use alternate limits
		use_data = 1;
		tds = Tau22;
		tde = Beta22;
		for (i = 0 ; i < npts ; i++)
			Kt [i] = pow (10., tds + (tde - tds) * i / (npts - 1.));
		for (i = 0 ; i < NE ; i++)
			Tau [i] = Eta [i];
	}

// First find Prony series for S22

	if (use_data == 0) {
		printf ("Fitting Kohlrausch Model For S22(t) Using ");
		for (i = 0 ; i < npts ; i++)
			Kc [i] = S022 * exp ( pow (Kt [i] / Tau22, Beta22) );

		Create_Prony_SVD (npts, Kt, Kc, NE, pow(10.,ps) / gamma, pow(10.,pe) * gamma,
								S22, Tau, &RMS);

		printf ("Resulting RMS Percent Error For S22: %8.4f%%\n\n", RMS);
	}

	else
		printf ("Passed S22 Prony Series\n\n");

// Now repeat process for S66

	if (use_data == 0) {
		printf ("Fitting Kohlrausch Model For S66(t) Using ");
		for (i = 0 ; i < npts ; i++)
			Kc [i] = S066 * exp ( pow (Kt [i] / Tau66, Beta66) );

		Create_Prony_SVD (npts, Kt, Kc, NE, pow(10.,ps) / gamma, pow(10.,pe) * gamma,
								S66, Tau, &RMS);

		printf ("Resulting RMS Percent Error For S66: %8.4f%%\n\n", RMS);
	}

	else
		printf ("Passed S66 Prony Series\n\n");

// NOTE: From here on, same in either data or Kohlrausch function case
// Now solve for GTemp = G12 = G21 using the fact that S11 and S12 = S21 are constant

	printf ("Solving For Unknown Q12(t) Using ");

	S_Twid = dvector (0, NE-1);						// Called S22Dot in MoTDM paper
	for (i = 0 ; i < NE ; i++)
		S_Twid [i] = S22 [i] / Nu12;
	S_Twid [0] -= Nu12 / E11;

	Invert_Prony_SVD (npts, Kt, Kt, NE, S_Twid, Tau, NE, GTemp, Eta,
							pow(10.,ps) / gamma, pow(10.,pe) * gamma, &RMS);

	printf ("RMS Error Finding Q12 Is %8.4f%%\n\n", RMS);
	for (i = 0 ; i < NE ; i++)
		G [1][i] = GTemp [i];  							// G [1][i] is G12

// Similarly, find GTemp = G66(t) from S66(t)

	printf ("Solving For Unknown Q66 (t) Using ");
	Invert_Prony_SVD (npts, Kt, Kt, NE, S66, Tau, NE, GTemp, Eta,
							pow(10.,ps) / gamma, pow(10.,pe) * gamma, &RMS);
	printf ("RMS Error Finding Q66 Is %8.4f%%\n\n",RMS);
	for (i = 0 ; i < NE ; i++)
		G [3][i] = GTemp [i];  			// G [3][i] is G66

// Now find G11 and G22 by simple evaluation

	printf ("Finding Q11 And Q22 By Algebraic Evaluation\n\n");
	for (i = 0 ; i < NE ; i++)
		G [0][i] = Nu12 * G [1][i];      			// G11 = Nu12 * G12 (t) + E11
	G [0][0] += E11;

	for (i = 0 ; i < NE ; i++)
		G [2][i] = G [1][i] / Nu12;					// G22 = G12 / Nu12

// Done in this routine - free memory and return

	free_dvector (Kt, 0);
	free_dvector (Kc, 0);
	free_dvector (Tau, 0);
	free_dvector (GTemp, 0);

	return;
}																	   // End Of Routine [Lamina_S2G_SVD]

/***************************************************************************************

	Create_Prony_Sign:	Finds sign controlled compliance or modulus Prony series

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This program finds a sign controlled Prony series to optimally fit a set of data.
	This is accomplished using a LM solver with sign control.  The guess is set using the
	three parameter model described in the Mechanics of Time Dependent Materials article
	(see Appendix).  Since the solution may be strongly dependent on the guess solution,
	the user is prompted if a new guess should be tried, etc.  The previous best solution
	can always be returned to if desired.

	This routine handles both compliance (ever increasing) Prony series of the form:

		S (t) = S0 + Sum i = 1 To NE-1 {S_i * [1 - exp (-t / Eta_i)]}

	and modulus (ever decreasing) Prony series of the form:

		G (t) = G0 + Sum i = 1 To NE-1 {G_i * exp (-t / Eta_i)}

	using the variable Flag, which is passed as 1 for S(t) and 2 for G(t).  In this form,
	sign control means that the coefficients G_i or S_i should be all positive for
	physically realistic materials.

	The guess uses the short- and long-term behavior of the material as a starting point.
	This is evaluated using the first and last data point of the passed behavior.  Note
	that if this behavior is not in accordance with Flag, this routine will fail with an
	error to that effect.

	Variables passed:

	NumPts		Number of data points to be fit
	tD				Time vector of data points
	XD				Value vector of data points
	NumElems		Number of Prony series elements to be used (NE above)
	Tau_Min		Used to set Tau relaxation/retardation time vector
	Tau_Max		Used to set Tau relaxation/retardation time vector
	Flag			1 if compliance Prony series, 2 if modulus Prony series

	Variables returned:

	Coeff			Prony series coefficients with sign control
	Tau			Prony series relaxation/retardation times
	RMS			RMS error of the signed method fit

	Roger Bradshaw, Northwestern University
	Code Completed: 17 Feb 1997
	Updated: 19 March 1997 To Correct Value p[0] After 2nd Call To LMSubset
	Updated: 24 May 1998		Changed standard deviation to unity (unless RMS is -1 in
									which data is used instead). Also added RMS_Mult to be 1 if
									unity and 100 (for %) if data for std_dev

***************************************************************************************/

void Create_Prony_Sign (intL NumPts, double *tD, double *XD, intL NumElems,
								double Tau_Min, double Tau_Max, double *Coeff, double *Tau,
								double *RMS, intL Flag)
{
	intL i, nvar, *avar, converged = 0, content;
	double *a, *p, chisq, i_chisq, MinVal, MaxVal, *C, *T, *CBest, RMSBest;
	double *std_dev, RMS_Mult;
	char message [80];

// First, check things that need checking

	if (Flag != 1 && Flag != 2)
		nrerror ("\nFlag must be 1 or 2 when passed to Create_Prony_Sign - Correct\n");

	MinVal = XD [0];
	MaxVal = XD [NumPts - 1];

	if (Flag == 1 && MinVal > MaxVal)	// Not compliance data
		nrerror ("\nCompliance Flag (1) Passed With Apparent Modulus Data In "
					"Create_Prony_Sign\n");

	if (Flag == 2 && MinVal < MaxVal)	// Not modulus data
		nrerror ("\nModulus Flag (2) Passed With Apparent Compliance Data In "
					"Create_Prony_Sign\n");

// Create standard deviation

	std_dev = dvector (0, NumPts-1);
	RMS_Mult = 1.;
	for (i = 0 ; i < NumPts ; i++) {
		if (*RMS != -1.)
			std_dev [i] = 1.;
		else {
			std_dev [i] = XD [i];
			RMS_Mult = 100.;
		}
	}

// Create vectors, matrices needed by LM solver

	a = dvector (0, 2 * NumElems + 2);
	avar = ivector (0, 2 * NumElems + 2);
	p = dvector (0, 4);

	a [0]	= NumElems;									// Set what can be set now
	a [2 * NumElems + 1] = tD [0];
	a [2*NumElems+2] = Flag + 0.001;

	nvar = NumElems;
	for (i = 0 ; i < NumElems ; i++)
		avar [i] = 1 + i;

	p [0] = -1.;										// Use RMS convergence criteria
	p [1] = 20;											// and these convergence parameters
	p [2] = 0.0005;
	p [3] = 1.;
	p [4] = 1.;

	C = &a [1];           							// Pointer to Coeff solution
	T = &a [NumElems + 1];							// Pointer to Tau solution

	CBest = dvector (0, NumElems-1);				// Store best solution for recovery
	RMSBest = pow (10., 50.);						// Set really big

// Loop over this section until converged according to user

	do {
		if (RMSBest >= pow (10., 49.)) {	// First run use default values
			printf ("\nUsing default parameters for initial Prony series guess\n");
			Perform_Guess_Calc (Flag, MinVal, MaxVal, 0.8, 2.,
									  0.05 * fabs (log10 (MaxVal / MinVal)), Tau_Min, Tau_Max,
									  NumElems, C, T);
		}
		else                             // Subsequent runs let user input
			Create_Prony_Guess (NumElems, MinVal, MaxVal, Tau_Min, Tau_Max, C, T);

		if (Flag == 1)
			sprintf(message,"@01@Prony Value: t=0 %%12.5E  t=Inf %%12.5E  RMS %%12.5E   ");
		else
			sprintf(message,"@01@Prony Value: t=Inf %%12.5E  t=0 %%12.5E  RMS %%12.5E   ");

		p [0] = -1.;
		if (NumPts > 2. * NumElems) {		// Set subset parameters here = NumElems
			i_chisq = -1.;
			chisq = NumElems + 0.001;
		}
		LM_Subset (tD, XD, std_dev, NumPts, a, 2 * NumElems + 3, avar, nvar,
					  &chisq, &i_chisq, Prony_Sign_Eval, message, p);

		printf ("\nUse this solution (1), try again (2), "
				  "or use best previous solution (3): ");
		scanf ("%ld", &content);

		if (content == 1)						// Exit and use this solution
			converged = 1;

		if (content == 2) {
			if (*RMS < RMSBest) {			// Replace best if current is better and resolve
				RMSBest = *RMS;
				for (i = 0 ; i < NumElems ; i++)
					CBest [i] = C [i];
			}
		}

		if (content == 3) {
			*RMS = RMSBest;
			for (i = 0 ; i < NumElems ; i++)
				C [i] = CBest [i];
			converged = 1;
		}

	} while (converged == 0);

// Done so place information of interest in return vector RMS and Coeff

	*RMS = RMS_Mult * sqrt (chisq / NumPts);
	for (i = 0 ; i < NumElems ; i++) {
		Coeff [i] = C [i];
		Tau [i] = T [i];
	}

	return;
}																	// End Of Routine [Create_Prony_Sign]

/***************************************************************************************

	Prony_Sign_Eval:	Evaluates sign control Prony series and derivative for LM solver

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine returns the behavior and necessary derivatives for modulus and
	compliance Prony series while enforcing sign control.  It will be used with an LM
	solver.  Sign control is enforced whenever t <= tfirst.

	a [0]											Number of Elements in Prony series (NumElems)
	a [1 .. NumElems]             		Coefficients of Prony Series
	a [NumElems+1 .. 2*NumElems]        Relaxation/Retardation times of Prony series
	a [2*NumElems+1]							Time of first data point (for sign control)
	a [2*NumElems+2]							Compliance (1) or Modulus (2)

***************************************************************************************/

void Prony_Sign_Eval (double t, double *a, double *y, double *dyda)
{
	intL Flag, i, NumElems;
	double *Coeff, *Tau, *Deriv, tfirst, tmp;

	NumElems = a [0];
	Coeff = &a [1];
	Tau = &a [NumElems + 1];
	Deriv = &dyda [1];
	tfirst = a [2 * NumElems + 1];
	Flag = a [2 * NumElems + 2];

	if (t < tfirst * 1.0001 || t == 0.) 			// Enforce sign control
		for (i = 0 ; i < NumElems ; i++)
			Coeff [i] = fabs (Coeff [i]);

	*y = Coeff [0];										// Special case for constant terms
	Deriv [0] = 1.;

	for (i = 1 ; i < NumElems ; i++) {				// Loop over non-constant elements
		tmp = exp (-t / Tau [i]);						// Use several times so do once as tmp
		if (Flag == 1) 									// Compliance value - change tmp
			tmp = 1. - tmp;
		*y += Coeff [i] * tmp;
		Deriv [i] = tmp;
	}

	return;
}																	  // End Of Routine [Prony_Sign_Eval]

/***************************************************************************************

	Create_Prony_Guess:	Creates initial guess for sign control solution using A, B, C

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine is passed the value of the Prony series at short- and long-time, and
	from this with three user input parameters creates a guess for use in the sign
	control Prony series LM solver.  This routine also creates the necessary relaxation/
	retaration time vector Tau.

	Variables passed:

	NumElems			Number of elements used in Prony series
	MinVal			Function value at first time point
	MaxVal			Function value at last time point
	Tau_Min			Minimum relaxation/retardation time
	Tau_Max			Maximum relaxation/retardation time

	Variables returned:

	Guess				Guessed Prony series coefficient vector
	Tau            Relaxation/retardation time vector (evenly spaced in log time)

	The user is prompted to enter three parameters (A, B, C) with defaults of
	(0.8, 2, 0.05/decade), respectively.  If the minimum and maximum values are correct,
	then A <= 1, B >= 1, C > 0.  These values are then used to calculate:

	X0			Behavior of function at t = 0 (A Operator MinVal)
	XI			Behavior of function at t = Infinity (B Operator MaxVal)
	C			Exponent for setting coefficient values

	For compliance data, the operator is multiplication (*); for modulus data, the
	operator is division (/).  This enforces the right sort of behavior at long and short
	times.

	Flag is set to 1 if this is compliance data (MinVal < MaxVal) or 2 if this is modulus
	data (MinVal > MaxVal).  In each of these cases, different guesses are obtained:

		Flag = 1			Guess_0 = X0
							Guess_i = (XI - X0) * (Tau_i) ^ C / TauSum
							TauSum = Sum Over i = [1, NumElems] of (Tau_i) ^ C

		Flag = 2			Guess_0 = XI
							Guess_i = (X0 - XI) * (Tau_i) ^ -C / TauSum
							TauSum = Sum Over i = [1, NumElems] of (Tau_i) ^ -C

	This guess ensures the behavior X0 and XI at t = 0 and t = Infinity.  As a rule,
	C should be set to 0 if X0 and XI are within an order of magnitude of one another.
	When larger differences exist, C should be increased moderately (perhaps the default
	rule used below of 0.05 per order of difference is a good rule).  For solution, try
	C = 0.001 initially and increase only if poor solution results.

	Roger Bradshaw, Northwestern University
	Code Completed: 17 Feb 1997
   Updated: 19 March 1997	Changed To +C For Compliance, -C For Modulus

***************************************************************************************/

void Create_Prony_Guess (intL NumElems, double MinVal, double MaxVal,
								 double Tau_Min, double Tau_Max, double *Guess, double *Tau)
{
	intL OK_Input, CompMod;
	double A, B, C;

// Begin by getting multiplier information (A, B, C) from user

	do {																  // Place data input cursor at 70
		OK_Input = 0;

		printf ("\nEnter parameters for initial");
		if (MinVal < MaxVal) {									  // Compliance data
			printf (" compliance ");
			CompMod = 1;
		}
		else {														  // Modulus data
			printf (" modulus ");
			CompMod = 2;
		}
		printf ("Prony series guess (0 = Default)\n");

		printf ("Enter short-time behavior multiplier A (Default 0.8, <= 1):           ");
		scanf ("%lf", &A);
		printf ("Enter long-time behavior multiplier B (Default 2.0, >= 1):            ");
		scanf ("%lf", &B);
		printf ("Enter non-uniform scale exponent C (Default 0.05/Decade, >= 0):       ");
		scanf ("%lf", &C);

		if (A < 0. || B < 0. || C < 0.) {
			printf ("\nValues must be positive - please reenter\n");
			OK_Input = 1;
		}

		if (A > 1.) {
			printf ("\nValue A must be less than or equal to 1 - please reenter\n");
			OK_Input = 1;
		}

		if (B < 1. && B != 0.) {
			printf ("\nValue B must be greater than or equal to 1 - please reenter\n");
			OK_Input = 1;
		}

	} while (OK_Input != 0);

// Set default values if requested

	if (A == 0.)
		A = 0.8;
	if (B == 0.)
		B = 2.;
	if (C == 0.)
		C = 0.05 * fabs (log10 (MaxVal / MinVal));

// Set limit values and remaining parameters

	Perform_Guess_Calc (CompMod, MinVal, MaxVal, A, B, C, Tau_Min, Tau_Max, NumElems,
							  Guess, Tau);

	printf ("\n");

	return;
}																  // End Of Routine [Create_Prony_Guess]

/***************************************************************************************

	Perform_Guess_Calc	Does the actual guess calculation

	Roger Bradshaw, Northwestern University
	March 17, 1997 (Happy St. Pats Day)
	Updated: 19 March 1997	To Account For +C (Modulus) and -C (Compliance)
	Updated: 1 May 1997		To ensure that C is always positive

***************************************************************************************/

void Perform_Guess_Calc (intL CompMod, double MinVal, double MaxVal,
								 double A, double B, double C, double Tau_Min, double Tau_Max,
								 intL NumElems, double *Guess, double *Tau)
{
	intL i;
	double X0, XI, ValMult, TauSum, Sign, CV;

   CV = fabs (C);

	if (CompMod == 1) {
		X0 = MinVal * A;
		XI = MaxVal * B;
		Guess [0] = X0;							// Constant value for compliance
		ValMult = XI - X0;						// Multiplier for compliance
		Sign = 1.;
	}

	else {
		X0 = MinVal / A;
		XI = MaxVal / B;
		Guess [0] = XI;							// Constant value for modulus
		ValMult = X0 - XI;						// Multiplier for modulus
		Sign = -1.;
	}

// Create relaxation time vector and TauSum term

	Set_Relaxation_Times (NumElems, Tau, Tau_Min, Tau_Max);

	TauSum = 0.;
	for (i = 1 ; i < NumElems ; i++)
		TauSum += pow (Tau [i], Sign * CV);

// Now create the guess and return

	for (i = 1 ; i < NumElems ; i++)
		Guess [i] = ValMult * pow (Tau [i], Sign * CV) / TauSum;

	return;
}

/***************************************************************************************

	Invert_Prony_Sign:	Inverts sign controlled compliance or modulus Prony series

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine finds the Prony series X(t) or Y(t) which satisfies the convolution
	integral equation:

		f(t) = Integral from 0 to t of {X(t - xi) Y (xi) dxi}

	where X(t) and Y(t) are Prony series of the form:

		X(t) = X0 + Sum i = [0, NumX-1]  X_i * exp (-t / Tau [i])
		Y(t) = Y0 + Sum j = [0, NumY-1]  Y_j * [1. - exp (-t / Eta [j])]

	and f(t) is given as a series of data points.  Either X or Y is found when the other
	is given.  Since this routine enforces sign control, the given function (X or Y) must
	also be in sign control (otherwise a solution may not be possible/good).

	The sign control solution is effected using a LM solver with sign control.  The guess
	is set using the three parameter model described in the Mechanics of Time Dependent
	Materials article (see Appendix).  Since the solution may be strongly dependent on
	the guess solution, the user is prompted if a new guess should be tried, etc.  The
	previous best solution can always be returned to if desired.

	This routine solves for (an ever increasing) Y(t) if Flag = 1 when X(t) and f are
	given; it solves for (an ever decreasing) X(t) if Flag = 2 when Y(t) and f are given.

	The guess uses the short- and long-term behavior of the material as a starting point.
	This is evaluated by approximating the unknown function as the inverse of the known
	function.  This is a good guess if f(t) = t, but may be less good in other cases.
	If needed, a future modification could be to first solve using the SVD method and
	estimate the values that way - this probably is not necessary.

	Variables passed:

	NumPts		Number of data points to be fit
	tD				Time vector of data points
	XD				Value vector of data points
	NumElems		Number of Prony series elements to be used (NE above)
	Tau_Min		Used to set Tau relaxation/retardation time vector
	Tau_Max		Used to set Tau relaxation/retardation time vector
	Flag			1 if finding compliance Prony Y(t), 2 if finding modulus Prony X(t) 
					If 11 or 12, subtract 10 for Flag and do not prompt user for questions 

	Variables returned:

	Coeff			Prony series coefficients with sign control
	Tau			Prony series relaxation/retardation times
	RMS			RMS error of the signed method fit

	Roger Bradshaw, Northwestern University
	Code Completed: 17 Feb 1997

	Code Updated: 24 May 1998	Added method to prevent asking questions about solution
										and changed standard deviation to unity (unless RMS is -1
										on entry and then data is used). Also added RMS_Mult as 1
										if unity and 100 (for %) if data for std_dev

***************************************************************************************/

void Invert_Prony_Sign (intL NumPts, double *tD, double *fD,
								intL NumX, double *X, double *Tau,
								intL NumY, double *Y, double *Eta,
								double Tau_Min, double Tau_Max, double *RMS, intL Flag)
{
	intL i, nvar, *avar, converged = 0, content, N, NumElems, ask_user;
	double *a, *p, chisq, i_chisq, MinVal, MaxVal, *C, *T, *CBest, RMSBest;
	double RMS_Mult, *std_dev;
	char message [200];

// First, check things that need checking

	ask_user = 1;
	if (Flag > 10) {
		ask_user = 0;
		Flag -= 10;
	}
	if (Flag != 1 && Flag != 2)
		nrerror ("\nFlag must be 1 or 2 when passed to Invert_Prony_Sign - Correct\n");

// Create standard deviation

	std_dev = dvector (0, NumPts-1);
	RMS_Mult = 1.;
	for (i = 0 ; i < NumPts ; i++) {
		if (*RMS != -1.)
			std_dev [i] = 1.;
		else {
			std_dev [i] = fD [i];
			RMS_Mult = 100.;
		}
	}

// Estimate MinVal and MaxVal

	if (Flag == 1) {											// Solving for compliance Y(t)
		MinVal = X [0];
		for (i = 1 ; i < NumX ; i++)
			MinVal += X [i] * exp (-tD [0] / Tau [i]);

		MaxVal = X [0];
		for (i = 1 ; i < NumX ; i++)
			MaxVal += X [i] * exp (-tD [NumPts-1] / Tau [i]);
	}

	else {														// Solving for modulus X(t)
		MinVal = Y [0];
		for (i = 1 ; i < NumY ; i++)
			MinVal += Y [i] * (1. - exp (-tD [0] / Eta [i]));

		MaxVal = Y [0];
		for (i = 1 ; i < NumY ; i++)
			MaxVal += Y [i] * (1. - exp (-tD [NumPts-1] / Eta [i]));
	}

	MinVal = 1. / MinVal;									// Estimate as inverse of known
	MaxVal = 1. / MaxVal;

	if (Flag == 1 && MinVal > MaxVal)					// Not compliance data
		nrerror ("\nCompliance Flag (1) Passed With Apparent Compliance X(t) In "
					"Invert_Prony_Sign\n");

	if (Flag == 2 && MinVal < MaxVal)					// Not modulus data
		nrerror ("\nModulus Flag (2) Passed With Apparent Modulus Y(t) In "
					"Invert_Prony_Sign\n");

// Create vectors, matrices needed by LM solver

	N = 2 * NumX + 2 * NumY + 4;							// Size of matrices/vectors
	a = dvector (0, N - 1);
	avar = ivector (0, N - 1);
	p = dvector (0, 4);

	a [0]	= NumX;												// Set what can be set now
	a [2 * NumX + 1]	= NumY;
	a [N - 2] = tD [0];
	a [N - 1] = Flag + 0.001;

	p [0] = -1.;												// Use RMS convergence criteria
	p [1] = 20;													// and these convergence parameters
	p [2] = 0.0005;
	p [3] = 1.;
	p [4] = 1.;

	if (Flag == 1)	{											// Solve for compliance
		nvar = NumY;
		for (i = 0 ; i < NumY ; i++)
			avar [i] = 2 * NumX + 2 + i;
		for (i = 0 ; i < NumX ; i++) {					// Store known X terms
			a [i + 1] = X [i];								// X Coefficients
			a [i + NumX + 1] = Tau [i];					// X Tau Values
		}
		C = &a [2 * NumX + 2];           				// Pointer to Y solution
		T = &a [2 * NumX + NumY + 2];						// Pointer to Eta solution
		CBest = dvector (0, NumY-1);						// Store best solution for recovery
		NumElems = NumY;										// Simplifies guess/converged part
	}

	else	{														// Solve for modulus
		nvar = NumX;
		for (i = 0 ; i < NumX ; i++)
			avar [i] = 1 + i;
		for (i = 0 ; i < NumY ; i++) {					// Store known Y terms
			a [i + 2 * NumX + 2] = Y [i];	 				// Y Coefficients
			a [i + 2 * NumX + NumY + 2] = Eta [i];		// Y Eta Values
		}
		C = &a [1];     				      				// Pointer to X solution
		T = &a [NumX + 1];									// Pointer to Tau solution
		CBest = dvector (0, NumX-1);						// Store best solution for recovery
		NumElems = NumX;										// Simplifies guess/converged part
	}

	RMSBest = pow (10., 50.);								// Set really big

// Loop over this section until converged according to user

	do {
		if (RMSBest >= pow (10., 49.)) {	// First run use default values
			if (ask_user == 1)
				printf ("\nUsing default parameters for initial Prony series guess\n");
			Perform_Guess_Calc (Flag, MinVal, MaxVal, 0.8, 2.,
									  0.05 * fabs (log10 (MaxVal / MinVal)), Tau_Min, Tau_Max,
									  NumElems, C, T);
		}
		else                             // Subsequent runs let user input
			Create_Prony_Guess (NumElems, MinVal, MaxVal, Tau_Min, Tau_Max, C, T);

		if (Flag == 1)
			sprintf(message,"@01@Prony Value: t=0 %%12.5E  t=Inf %%12.5E  RMS %%12.5E   ");
		else
			sprintf(message,"@01@Prony Value: t=Inf %%12.5E  t=0 %%12.5E  RMS %%12.5E   ");

		p [0] = -1.;
		if (NumPts > 2. * NumElems) {		// Set subset parameters here = NumElems
			i_chisq = -1.;
			chisq = NumElems + 0.001;
		}

		LM_Subset (tD, fD, std_dev, NumPts, a, N, avar, nvar,
					  &chisq, &i_chisq, Invert_Sign_Eval, message, p);

		if (ask_user == 1) {
			printf ("\nUse this solution (1), try again (2), "
					  "or use best previous solution (3): ");
			scanf ("%ld", &content);
		}
		else
			content = 1;

		if (content == 1)						// Exit and use this solution
			converged = 1;

		if (content == 2) {
			if (*RMS < RMSBest) {			// Replace best if current is better and resolve
				RMSBest = *RMS;
				for (i = 0 ; i < NumElems ; i++)
					CBest [i] = C [i];
			}
		}

		if (content == 3) {
			*RMS = RMSBest;
			for (i = 0 ; i < NumElems ; i++)
				C [i] = CBest [i];
			converged = 1;
		}

	} while (converged == 0);

// Done so place information of interest in RMS and appropriate vectors and return

	*RMS = RMS_Mult * sqrt (chisq / NumPts);
	for (i = 0 ; i < NumElems ; i++) {
		if (Flag == 1) {
			Y [i] = C [i];
			Eta [i] = T [i];
		}
		if (Flag == 2) {
			X [i] = C [i];
			Tau [i] = T [i];
		}
	}

	return;
}																	// End Of Routine [Invert_Prony_Sign]


/***************************************************************************************

	Invert_Sign_Eval:	Evaluates sign control Prony series and derivative for LM solver

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	Consider two Prony series of the form

		X(t) = X0 + Sum i = [0, NumX-1]  X_i * exp (-t / Tau [i])
		Y(t) = Y0 + Sum j = [0, NumY-1]  Y_j * [1. - exp (-t / Eta [j])]

	The convolution of these two:

		f(t) = Integral from 0 to t of {X(t - xi) Y (xi) dxi}

	can be written as either:

		f(t) = Sum Over i in [0, NumX-1]  X_i * Psi_i (t)
		f(t) = Sum Over j in [0, NumY-1]  Y_j * Theta_j (t)

	where Psi and Theta are the basis functions as described in the Mechanics of Time
	Dependent Materials article.

	This routine evaluates f(t) given X and Y as above and returns the derivative of f
	wrt the coefficients X_i (if X is being solved for) or Y_j (if Y is being solved
	for).  This routine enforces sign control, and will be used with an LM solver.  Sign
	control is enforced whenever t <= tfirst.

	Variables passed

	a [0]											Number of modulus Prony series elements (NumX)
	a [1 .. NumX]		             		Coefficients of modulus Prony series
	a [NumX+1 .. 2*NumX]				      Relaxation times of modulus Prony series
	a [2*NumX+1]				      		Number of compliance Prony series elements (NumY)
	a [2*NumX+2 .. 2*NumX+NumY+1]   		Coefficients of compliance Prony series
	a [2*NumX+NumY+2..2*NumX+2*NumY+1]	Relaxation times of compliance Prony series
	a [2*NumX+2*NumY+2]						Time of first data point (for sign control)
	a [2*NumX+2*NumY+3]						Solve for Compliance (1) or Modulus (2)

	Roger Bradshaw, Northwestern University
	Code Completed: 17 Feb 1997

***************************************************************************************/

void Invert_Sign_Eval (double t, double *a, double *y, double *dyda)
{
	intL i, j, NumX, NumY, Flag;
	double *X, *Tau, *Y, *Eta, *Deriv, tfirst, Theta, Psi, *XExp, *YExp;

	NumX = a [0];											// Set values and pointers
	X = &a [1];
	Tau = &a [NumX + 1];
	NumY = a [2 * NumX + 1];
	Y = &a [2 * NumX + 2];
	Eta = &a [2 * NumX + NumY + 2];
	tfirst = a [2 * NumX + 2 * NumY + 2];
	Flag = a [2 * NumX + 2 * NumY + 3];

	XExp = dvector (0, NumX - 1);						// Reduce calculations required below
	for (i = 1 ; i < NumX ; i ++)
		XExp [i] = exp (-t / Tau [i]);

	YExp = dvector (0, NumY - 1);                // Reduce calculations required below
	for (i = 1 ; i < NumY ; i ++)
		YExp [i] = exp (-t / Eta [i]);

	if (t < tfirst * 1.0001 || t == 0.) {			// Enforce sign control
		for (i = 0 ; i < NumX ; i++)
			X [i] = fabs (X [i]);
		for (i = 0 ; i < NumY ; i++)
			Y [i] = fabs (Y [i]);
	}

// Break solution into the two major types here

	if (Flag == 1)	{										// Solve for compliance (find Theta)
		Deriv = &dyda [2 * NumX + 2];

		Theta = X [0] * t;								// Special case for Theta_0
		for (i = 1 ; i < NumX ; i++)
			Theta += X [i] * Tau [i] * (1. - XExp [i]);
		Deriv [0] = Theta;
		*y = Y [0] * Theta;

		for (j = 1 ; j < NumY ; j++) {				// Remainder loop over j
			Theta = X [0] * (t + Eta [j] * (YExp [j] - 1.));
			for (i = 1 ; i < NumX ; i++)
				Theta += X [i] * Calc_Zij_For_Inverse (Tau[i], Eta[j], t, XExp[i], YExp[j]);
			Deriv [j] = Theta;
			*y += Y [j] * Theta;
		}
	}

	else {                           				// Solve for modulus (find Psi)
		Deriv = &dyda [1];

		Psi = Y [0] * t;									// Special case for Psi_0
		for (j = 1 ; j < NumY ; j++)
			Psi += Y [j] * (t + Eta [j] * (YExp [j] - 1.));
		Deriv [0] = Psi;
		*y = X [0] * Psi;

		for (i = 1 ; i < NumX ; i++) {				// Remainder loop over i
			Psi = Y [0] * Tau [i] * (1. - XExp [i]);
			for (j = 1 ; j < NumY ; j++)
				Psi += Y [j] * Calc_Zij_For_Inverse (Tau[i], Eta[j], t, XExp[i], YExp[j]);
			Deriv [i] = Psi;
			*y += X [i] * Psi;
		}
	}

	free_dvector (XExp, 0);
	free_dvector (YExp, 0);

	return;
}			 													    // End Of Routine [Invert_Sign_Eval]

/***************************************************************************************

	Calc_Zij_For_Inverse

	This routine returns z_ij(t) as shown in the Mechanics of Time Dependent Materials
	article.  Used by Invert_Sign_Eval routine.

	Roger Bradshaw, Northwestern University
	Code Completed: 17 Feb 1997
   Code Updated: 2 May 1997		Fixed sign error in case when Tau_i = Eta_j

***************************************************************************************/

double Calc_Zij_For_Inverse (double Tau_i, double Eta_j, double t,
									  double XExp_i, double YExp_j)
{
	double z_ij, Tau_Avg, Exp_Avg;

	if (EqualValues (Tau_i, Eta_j, 0.0001) != 0) {		// Tau_i Not Equal To Eta_j
		z_ij =  Tau_i * (1. - XExp_i);
		z_ij -= Eta_j * (1. - YExp_j);
		z_ij *= Tau_i / (Tau_i - Eta_j);
	}

	else {                                             // Tau_i Equal To Eta_j
		Tau_Avg = 0.5 * (Tau_i + Eta_j);  					// Average together since close
		Exp_Avg = 0.5 * (XExp_i + YExp_j);					// but not nec. identical
		z_ij =  1. + t / Tau_Avg;
		z_ij =  1. - Exp_Avg * z_ij;							// Changed this line
		z_ij *= Tau_Avg;
	}

	return z_ij;
}																// End Of Routine [Calc_Zij_For_Inverse]

/***************************************************************************************

	Create_Dynamic_SVD: This routine creates a Prony series for dynamic data using SVD

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine is given data for X' and X" vs Frequency w as a series of data points.
	It finds the optimal Prony series to fit this data by using the relationship:

		X (t) = X0 + Sign_GJ * [(Sum i = 1 to N-1) of X_i * exp (- t / Tau_i)]

		X'(w) = X0 + Sign_GJ * [(Sum i = 1 to N-1) of X_i * T_i ^ 2 / (1 + T_i ^ 2)
		X"(w) = (Sum i = 1 to N-1) of X_i * T_i / (1 + T_i ^ 2)
		T_i = w * Tau_i

	The standard deviation may be weighted to favor X' over X" (or vice verse).  The
	term X [0] contains the value SignGJ and is either 1 (modulus) or -1 (compliance)
	The data point (wD, XD) can contain either type of data: if wD < 0, the point given
	is (-wD, X"(wD)); if wD > 0, the data point given is (wD, X'(wD)).

	Variables passed:

	NumPts		Number of data points to be fit
	wD				Frequency vector of data points
	XD				Value vector of data points
	NumElems		Number of Prony series elements to be used (N above)
	Tau_Min		Used to set Tau relaxation/retardation time vector
	Tau_Max		Used to set Tau relaxation/retardation time vector

	Variables returned:

	X				Prony series coefficients obtained using SVD
	Tau			Prony series relaxation/retardation times
	RMS			RMS error of the signed method fit

	The solution is effected using CoeffAll and Dynam_Basis - see below for description

	Roger Bradshaw, Northwestern University
	Code Completed: December 1996
	Code Updated: 17 Feb 1997	Improved Documentation

***************************************************************************************/

void Create_Dynamic_SVD (intL NumPts, double *wD, double *XD, double *std_dev,
								 intL NumElems, double Tau_Min, double Tau_Max,
								 double *X, double *Tau, double *RMS)
{
	intL i;
	double *CoeffAll, value;

	printf ("Prony Series SVD Solution\nInitializing...");

// Create the Tau vector based on Tau_Min, Tau_Max, evenly spaced in log time

	Tau [0] = pow (10., 50.);
	value = log10 (Tau_Max) - log10 (Tau_Min);
	for (i = 1 ; i < NumElems ; i++)
		Tau [i] = pow (10., log10 (Tau_Min) + value * (i - 1) / (NumElems - 2));

// Will solve for CoeffAll - use second half to pass Tau values to Prony_Basis

	CoeffAll = dvector (0, 2 * NumElems);
	for (i = 0 ; i < NumElems ; i++)
		CoeffAll [NumElems + i] = Tau [i];
	if (X [0] < 0.)
		CoeffAll [2 * NumElems] = -1.;		// SignGJ for compliance
	else
		CoeffAll [2 * NumElems] = 1.;			// SignGJ for modulus

// Now we have the data points, the relaxation times - solve using svdfit

	svdfit (wD, XD, std_dev, NumPts, CoeffAll, NumElems, RMS, Dynam_Basis);

// Solve for the RMS % error

	*RMS /= NumPts;
	*RMS = 100. * sqrt (*RMS);  // Convert it to RMS % error
	printf ("...Done...RMS %10.4E\n", *RMS);

// Move coefficients to proper locations

	for (i = 0 ; i < NumElems ; i++)
		X [i] = CoeffAll [i];

	free_dvector (CoeffAll, 0);

	return;
}																	// End Of Routine [Create_Dyamic_SVD]


/***************************************************************************************

	Dynam_Basis:	Prony Series Basis Functions Evaluation Routine For Dynamic Data

	This routine evaluates the basis functions for dynamic data for the frequency
	passed as FreqSign.  If FreqSign is negative, X"(-FreqSign) is desired; otherwise,
	X'(FreqSign) is desired.  See Create_Dynamic_SVD for a complete description.

	CoeffTau [0 - NumElems-1] = X_i
	CoeffTau [NumElems - 2*NumElems-1] = Tau_i
	CoeffTau [2*NumElems] = SignGJ
	NumElems is passed by command line

	Roger Bradshaw, Northwestern University
	Written: December 1996

***************************************************************************************/

void Dynam_Basis (double FreqSign, double *basis, double *CoeffTau, intL NumElems)
{
	intL i, Use_P_PP;
	double Freq, SignGJ, c_i;

	Freq = fabs (FreqSign);									// Will operate on this
	Use_P_PP = 1;												// Means that this is X' data point
	if (FreqSign < 0.)
		Use_P_PP++;												// Means that this is X" data point

	if (Use_P_PP == 1) {                				// Setting X' data point bases
		basis [0] = 1.;
		SignGJ = CoeffTau [2 * NumElems];				// Set sign of basis function (+/-1)
		for (i = 1 ; i < NumElems ; i++) {  			// Loop over all remaining elements
			c_i = Freq * CoeffTau [NumElems + i];     // Common term
			c_i *= c_i;											// Square that term
			basis [i] = SignGJ * c_i / (1. + c_i);		// Done
		}
	}

	else {                									// Setting X" data point bases
		basis [0] = 0.;
		for (i = 1 ; i < NumElems ; i++) {  			// Loop over all remaining elements
			c_i = Freq * CoeffTau [NumElems + i];     // Common term
			basis [i] = c_i / (1. + c_i * c_i);			// Done
		}
	}

	return;
}																			// End Of Routine [Dynam_Basis]


/***************************************************************************************

	Prony_Dynam:	Prony series evaluation routine for dynamic data with sign control

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine is used by the executable DYNAMFIT.C in a LM solver with sign control.
	It is passed the parameter list a below, and evaluates the function at the passed
	frequency x.  If x is negative, X"(-x) is desired; otherwise, X'(x) is desired.
	This routine enforces sign control using the first frequency point.  The value of
	X' or X" is returned as well as the derivatives dX'/dX_i or dX"/dX_i

	The Prony series and other terms are as described in Create_Dynamic_SVD.  Note that
	there is no equivalent routine Create_Dynamic_Sign - this is what DYNAMFIT does.

		a [0] = NumElems
		a [1 - NumElems] = Coeff [i]
		a [NumElems+1 - 2*NumElems] = Tau [i]
		a [2*NumElems + 1] = SignGJ
		a [2*NumElems + 2] = Freq [0]

	Roger Bradshaw, Northwestern University
	Completed: December 1996

***************************************************************************************/

void Prony_Dynam (double x, double *a, double *y, double *dyda)
{
	intL i, Use_P_PP, NumElems;
	double Freq, SignGJ, c_i, Freq_Min, basis;

	NumElems = a [0];

// Zero all necessary terms

	*y = 0.;
	for (i = 0 ; i <= 2 * NumElems + 2 ; i++)
		dyda [i] = 0.;

// Enforce all signs to be positive if it first data point

	Freq = fabs (x);									// Will operate on this
	Freq_Min = a [2 * NumElems + 2];
	if (Freq_Min > 0. && Freq_Min < Freq * 1.001)
		for (i = 0 ; i < NumElems ; i++)
			a [1 + i] = fabs (a [1 + i]);

// Set up basic parameters

	Use_P_PP = 1;								// Means that this is X' data point
	if (x < 0.)
		Use_P_PP++;								// Means that this is X" data point

// Find X' data point values and derivatives

	if (Use_P_PP == 1) {
		*y = a [1];												// Constant for constant term
		dyda [1] = 1.;

		if (a [2 * NumElems + 1] < 0.)
			SignGJ = -1.;										// Set sign of basis function (+/-1)
		else
			SignGJ = 1.;

		for (i = 1 ; i < NumElems ; i++) {  			// Loop over all elements
			c_i = Freq * a [NumElems + 1 + i]; 			// Common term
			c_i *= c_i;											// Square that term
			basis = SignGJ * c_i / (1. + c_i);			// Basis function for i
			*y += a [1 + i] * basis;						// Add ith component to y
			dyda [1 + i] = basis;							// dy/dX_i is simply the basis
		}
	}

// Otherwise find X" data point values and derivatives

	else {                					// Setting X" data point bases
		dyda [1] = 0.;											// Never a contribution from constant
		for (i = 1 ; i < NumElems ; i++) {  			// Loop over all elements
			c_i = Freq * a [NumElems + 1 + i]; 			// Common term
			basis = c_i / (1. + c_i * c_i);				// Basis function for i
			*y += a [1 + i] * basis;						// Add ith component to y
			dyda [1 + i] = basis;							// dy/dX_i is simply the basis
		}
	}

	return;
}


/***************************************************************************************

	Set_Relaxation_Times:	This function evenly spaces relaxation times

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This code exists in many routines, but can be replaced by a call to this new function
	below.  It sets Tau [0] to 1E50, and evenly spaces the remaining NumElem-1 relaxation
	times in log time between Tau_Min and Tau_Max.

	Roger Bradshaw, Northwestern University
	Completed: Winter 1996

***************************************************************************************/

void Set_Relaxation_Times (intL NumElems, double *Tau, double Tau_Min, double Tau_Max)
{
	intL j;
	double temp;

	Tau [0] = pow (10., 50.);
	temp = (log10 (Tau_Max) - log10 (Tau_Min)) / (NumElems - 2.);
	for (j = 1 ; j < NumElems ; j++)
		Tau [j] = pow (10., log10 (Tau_Min) + temp * (j - 1.));

	return;
}																// End Of Routine [Set_Relaxation_Times]


/***************************************************************************************

	Step_Response: Solution for VE response to a series of step loads

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine does it all for step loadings in effective time!  It accepts 3 different
	material models (Kohlrausch compliance/modulus, Prony compliance, Prony modulus), can
	work with 3 different forms of effective time (standard, CSF, combined), and also
	calculates the derivatives as needed by the LM solver.	Obviously, the setup for
	such a routine is a bit complicated, so it is detailed below.

	Roger Bradshaw, Northwestern University
	Code Completed: 14 Feb 1997
	Updated: 28 Feb 1997		Misc. bug fixes, verified results for all cases using MathCad
	Updated: 25 April 1998	Changed documentation to note Kohlrausch modulus is in here
  
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine is passed the following parameters:

	t		Time currently being evaluated

	y		Evaluation of step response at t

	a		Parameter list in accordance with LM solver

	dyda	Derivative of y wrt parameters (as needed)

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	The parameter list a tells us what to do.  The first few terms are always the same:

	a [0] 	Solution code (see below)
	a [1] 	Time of first data point

	Step Information
	~~~~~~~~~~~~~~~~
	a [2] 									Number of load steps (NL)
	a [3] .. a [2+NL]						Load Step Magnitude (Delta Sigma_i)
	a [3+NL] .. a [2+2*NL]				Time Of Load Step (Rho_i)
	a [3+2*NL] .. a [2+3*NL]			Effective Time At Load Step (Rho_i)

	b = Material Model Start Index = 3 + 2*NL (means first material param is at a [b])

	If there is to be a single step, set a [2] = 1, a [3] = Sigma0, a [4] = a [5] = 0.
	Note that this solution sets the effective time at each load step so it need not be
	initialized.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	SOLUTION CODE
	~~~~~~~~~~~~~

	The remainder of the variables are dependent upon the solution code.  This is given
	as an integer of the form XYZ, where:

	X = Solution Type: Find Derivatives (1) Or Do Not (2)

	Y = Material Model: Kohlrausch Modulus/Compliance (1),
							  Prony Modulus (2), Or Prony Compliance (3)

	Z = Eff. Time: Standard (1), CSF Method (2), Combination (3)

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	FIRST TIME POINT
	~~~~~~~~~~~~~~~~

	Note how this routine will be used.  It will always be used to analyze the response
	to a given set of data time points (t_i) - even though this routine is only called
	one point at a time.  For a set of parameters, some items will remain the same for
	all time point evaluations; thus, these could only be calculated when the first time
	point is evaluated.  The values which falls into this category are the effective time
	values at each step point as well as their derivatives.

	The first time data point is passed by tfirst.  If it is nonnegative, sign control
	is also enforced: this means that the coefficients G, J, L, Kohlrausch params, etc
	are all set to their absolute value.  If tfirst is negative, no sign control is used
	and tfirst is set to its absolute value.  Some parameters will be automatically set
	to positive values as negative values would cause the code to blow up: an example
	of this is Tau in the Kohlrausch model.  Such exceptions will be noted.

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	MATERIAL MODELS

	For Kohlrausch Compliance/Modulus Models (Code X0Z/X1Z):
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	a [b]			S0
	a [b+1]		Tau
	a [b+2]		Beta
	a [b+3]		Exponent Sign a

	c = Effective Time Start Index = b + 4

	For Prony Compliance/Modulus Models (Code X2Z/X3Z):
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
	a [b]									NumElems (NE)
	a [b+1] .. a [b+NE]				Coefficient G_k or J_k
	a [b+NE+1] .. a [b+2*NE]		Relaxation/Retardation Time Tau_k

	c = Effective Time Start Index = b + 2*NE + 1

	Note that G_0, J_0 is constant, so Tau_0 is ignored (treated as infinity)

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	EFFECTIVE TIME MODELS

	Standard Model (Code XY1):
	~~~~~~~~~~~~~~~~~~~~~~~~~

	a [c]									Shift Rate Mu
	a [c+1]								Reference Time teref
	a [c+2]								Initial Aging Time te0

	d = Effective Time Derivatives At Steps = c + 3

	CSF Method Model (Code XY2):
	~~~~~~~~~~~~~~~~~~~~~~~~~~~

	a [c]									Number Of Alpha Terms (NA)
	a [c+1]								Effective Time Minimization Parameter (Lambda *)
	a [c+2] .. a [c+1+NA]			Coefficients L_k
	a [c+2+NA] .. a [c+1+2*NA]		Relaxation Times Alpha_k

	d = Effective Time Derivatives At Steps = c + 2 + 2 * NA

	Combination Model (Code XY3):
	~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	a [c]									Shift Rate Mu
	a [c+1]								Reference Time teref
	a [c+2]								Initial Aging Time te0
	a [c+3]								Number Of Alpha Terms (NA)
	a [c+4]								Effective Time Minimization Parameter (Lambda *)
	a [c+5] .. a [c+4+NA]			Coefficients L_k
	a [c+5+NA] .. a [c+4+2*NA]		Relaxation Times Alpha_k

	d = Effective Time Derivatives At Steps = c + 5 + 2 * NA

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	EFFECTIVE TIME AT STEP DERIVATIVES

	From the effective time model, denote the number of varying parameters as NP, which
	is either 3, NA, or 3 + NA.  At the first time data point (tfirst), we will evaluate
	the effective time at each step, as well as its derivative wrt each of the varying
	parameters.  This should speed up the code significantly.  The first time step we
	know to be 0, which is equivalent to it not being there at all; consequently, we will
	set all of its derivatives to 0 as well.

	i = 0 .. NL-1, j = 0 .. NP-1

	a [d + i * NP + j] = dLambda / dLamParam_j At t = Step_i

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	SIZE OF a, dyda

	One of the difficulties in this routine is the user knowing beforehand the size of a
	required, especially due to the effective time derivative storage.  While you can
	take the "Better safe than sorry when memory is cheap" approach, the values below
	will suffice for the solution code given when:

		NL = Number of load steps (1 or more)
		NE = Number of Prony elements used in Prony model
		NA = Number of Prony elements used in CSF effective time model
		NP = Number of varying effective time parameters (set below)

		A = Number of slots required for load step data
		B = Number of slots required for material model data
		C = Number of slots required for effective time model
		D = Number of slots required for derivatives of effective time model

	For calculation of derivatives declare:

		a = dvector (0, A + B + C + D - 1)							// Model coefficients
		dyda = dvector (0, A + B + C - 1)							// Model derivatives
		ma = A + B + C														// Number of coefficients

	When derivatives are not calculated declare:

		a = dvector (0, A + B + C - 1)								// Model coefficients
		dyda = dvector (0, A + B + C - 1)							// Model derivatives
		ma = A + B + C														// Number of coefficients

	Where the terms A, B, C are given as:

		Load step information							A = 3 + 3 * NL

		Kohlrausch model									B = 4
		Prony model (compliance or modulus)			B = 2 * NE + 1

		Standard effective time							C = 3
		CSF method											C = 2 + 2 * NA
		Combined standard/CSF method					C = 5 + 2 * NA

		Eff. time deriv. standard method				D = 3 * NL
		Eff. time deriv. CSF	method					D = NA * NL
		Eff. time deriv. combined method				D = (3 + NA) * NL

	These values are set in a different routine set_step_response_size

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	Routine Approach:
	~~~~~~~~~~~~~~~~

	This routine will set pointers appropriately depending upon the code passed.
	Sign control/effective time at steps will be initialized if first data point
	Effective time and its derivatives (if necessary) will be calculated
	The response and derivatives (if necessary) will be calculated
	The program will then return

***************************************************************************************/

void Step_Response (double t, double *a, double *y, double *dyda)
{
	intL i, j, k, deriv, model, eff_type, sign_control, first_point, b, c, d;
	intL NL, NE, NP;
	double tfirst, *Sigma, *Step, *LamStep, *Coeff, *Tau, S0, KohlTau, Beta, Exp_Sign;
	double *LamParam, Lambda, *dLambda_dt, delta_Lam, term, tmp, *dy_dRef, *dy_dLam;
	double Ka, Kb, Kc;

// First evaluate the solution code

	i = a [0];										// Set the effective time model being used
	eff_type = i % 10;
	if (eff_type < 1 || eff_type > 3)
		nrerror ("\nEffective Time Model Code Must Be 1-3 In Step_Response\n");

	i /= 10;
	model = i % 10;								// Set the material model being used
	if (model < 1 || model > 3)
		nrerror ("\nMaterial Model Code Must Be 1-3 In Step_Response\n");

	deriv = i / 10;                        // Set whether to find the derivatives or not
	if (deriv < 1 || deriv > 2)
		nrerror ("\nDerivative Code Must Be 1-2 In Step_Response\n");

// Set sign control response

	sign_control = 1;			// 1 means use sign control, 0 means not
	first_point = 0;			// 0 means this is not first point, 1 means it is

	tfirst = a [1];
	if (tfirst < 0.) {
		tfirst *= -1.;
		sign_control = 0;
	}
	if (t < tfirst * 1.0001)	// Set to 1 if at first data point
		first_point = 1;

// Get the step information

	NL = a [2];
	if (NL <= 0)
		nrerror ("\nNumber Of Load Steps In Step_Response Must Be 1 Or Greater\n");

	Sigma = &a [3];
	Step = &a [3 + NL];
	LamStep = &a [3 + 2 * NL];
	b = 3 + 3 * NL;		  										// Material model counter

	if (Step [0] != 0.)
		nrerror ("\nFirst Step Must Occur At t = 0 - Correct\n");
	for (i = 1 ; i < NL ; i++)
		if (Step [i] <= Step [i-1])
			nrerror ("\nStep Times Must Be Ever-Increasing - Correct\n");

// Get the appropriate material model information

	if (model == 1) {                                  // Make these positive regardless
		if (first_point == 1) {  								// as model will blow up if not
			a [b] = fabs (a [b]);                        // S0
			a [b+1] = fabs (a [b+1]);                    // Tau
			a [b+2] = fabs (a [b+2]);                    // Beta
		}

		S0 = a [b];
		KohlTau = a [b + 1];
		Beta = a [b + 2];
		Exp_Sign = a [b + 3];									// Don't change this sign though!

		if (Exp_Sign != 1. && Exp_Sign != -1.)
			nrerror ("\nKohlrausch Sign Parameter Must Be 1 Or -1 - Correct\n");

		dy_dRef = &dyda [b];										// Set ptr to dY_dRefParameter

		c = b + 4;													// Effective Time Counter
	}

	else {
		NE = a [b];
		if (NE <= 1)
			nrerror ("\nNumber Of Prony Elements In Step_Response Must Be 2 Or Greater\n");

		Coeff = &a [b + 1];										// Set ptr to Coeff, Tau
		Tau = &a [b + NE + 1];

		if (sign_control == 1 && first_point == 1)		// Enforce sign control of Coeffs
			for (i = 0 ; i < NE ; i++)
				Coeff [i] = fabs (Coeff [i]);

		dy_dRef = &dyda [b + 1];                        // Set ptr to dY_dRefParameter

		c = b + 2 * NE + 1;  									// Effective Time Counter
	}

// Set effective time pointer and enforce sign control

	LamParam = &a [c];
	dy_dLam = &dyda [c];

	if (eff_type == 1 || eff_type == 3)						// Make these positive regardless
		if (first_point == 1) {  								// as model will blow up if not
			a [c] = fabs (a [c]);								// Mu
			a [c + 1] = fabs (a [c + 1]);                // teref
			a [c + 2] = fabs (a [c + 2]);                // te0
		}

	if (eff_type == 1) {		// Set number of varying parameters for standard model
		NP = 3;
		d = c + 3;													// Eff. Time Derivative Counter
	}

	if (eff_type == 2) {    // Set number of varying parameters for CSF model
		NP = a [c];
		if (NP <= 1)
			nrerror ("\nNumber Of CSF Effective Time Elements In Step_Response"
						" Must Be 1 Or Greater\n");
		d = c + 2 + 2 * NP;										// Eff. Time Derivative Counter

		if (sign_control == 1 && first_point == 1)
			for (i = 0 ; i < NP ; i++)
				a [c + 2 + i] = fabs (a [c + 2 + i]);
	}

	if (eff_type == 3) {    // Set number of varying parameters for combined model
		NP = a [c + 3];
		if (NP <= 1)
			nrerror ("\nNumber Of CSF Effective Time Elements In Step_Response"
						" Must Be 1 Or Greater\n");
		d = c + 5 + 2 * NP;                             // Eff. Time Derivative Counter

		if (sign_control == 1)
			for (i = 0 ; i < NP ; i++)
				a [c + 5 + i] = fabs (a [c + 5 + i]);

		NP += 3;					// Note that standard model params also vary
	}

// Sign control (if needed) has been established.  If first step, begin by calculating
// the effective time at each of the steps as well as the derivative of the effective
// time at that step wrt the effective time variable parameters.  Note that if
// derivatives are not necessary (ie evaluation of strain only not parameter fitting),
// the eff_type is set to a negative value

	if (first_point == 1) {									// First time step
		if (deriv == 1)
			for (i = 0 ; i < NL ; i++)
				calc_lambda_types (Step [i], LamParam, &LamStep [i], &a [d+i*NP], eff_type);
		else
			for (i = 0 ; i < NL ; i++)
				calc_lambda_types (Step [i], LamParam, &LamStep [i], &a [d+i*NP],-eff_type);
	}

// Now Lambda at each step is known, as well as dLambda/dLambdaParam at step.  Calculate
// the same values for the current time step.  Place the derivatives in dLambda_dt

	dLambda_dt = dvector (0, NP-1);
	if (deriv == 1)
		calc_lambda_types (t, LamParam, &Lambda, dLambda_dt, eff_type);
	else
		calc_lambda_types (t, LamParam, &Lambda, dLambda_dt, -eff_type);

// Now lets begin by calculating the strain value predicted

	*y = 0.;
	for (i = 0 ; i < NL ; i++) {			// Loop over load steps
		if (Lambda > LamStep [i]) {      // Add only if this is so (Heaviside condition)
			delta_Lam = Lambda - LamStep [i];

			if (model == 1)											// Kohlrausch model
				*y += Sigma [i] * S0 * exp (Exp_Sign * pow (delta_Lam / KohlTau, Beta));

			else {
				tmp = Coeff [0];
				for (j = 1 ; j < NE ; j++) {
					term = exp (- delta_Lam / Tau [j]);
					if (model == 2)									// Prony Modulus Model
						tmp += Coeff [j] * term;
					else                                      // Prony Compliance Model
						tmp += Coeff [j] * (1. - term);
				}
				*y += Sigma [i] * tmp;
			}
		}
	}

// Now complete the remainder only in the case that derivatives are needed
// There are two cases to consider.  First, if the effective time model is not the
// standard model, this is a CSF method solution and the reference curve is not varying;
// hence, the derivative of strain wrt reference curve params are not necessary.  The
// second case is the opposite: the reference curve is being found, so the strain
// derivative wrt the reference params as well as wrt the standard model effective time
// params need to be found.  Do each of these cases separately.

	if (deriv == 1 && eff_type == 1) { 						 		// Finding reference curve
		for (i = 0 ; i < NL ; i++) {									// Loop over steps
			if (Lambda > LamStep [i]) {      					 	// Nothing to do if not so

				delta_Lam = Lambda - LamStep [i];					// Basic component

				if (model == 1) {										  	// Kohlrausch model ref.

					if (i == 0) 											// Clear out dyda
						for (j = 0 ; j < 3 ; j++) {
							dy_dRef [j] = 0.;       			 		// Three ref params to clear
							dy_dLam [j] = 0.;								// Three lam params to clear
						}

					Ka = delta_Lam / KohlTau;							// Params for dy/dRef
					Kc = log (Ka);
					Ka = Exp_Sign * pow (Ka, Beta);
					Kb = exp (Ka);

					dy_dRef [0] += Sigma [i] * Kb;						// dy_dS0
					term = S0 * Beta / KohlTau;
					dy_dRef [1] -= Sigma [i] * term * Ka * Kb;		// dy_dTau
					dy_dRef [2] += Sigma [i] * S0 * Ka * Kb * Kc;	// dy_dBeta

					term = S0 * Beta / delta_Lam * Ka * Kb;			// dS_dt

					for (j = 0 ; j < 3 ; j++) {
						tmp = dLambda_dt [j] - a [d + i*NP + j]; 		// dLam_t - dLam_Step
						dy_dLam [j] += Sigma [i] * term * tmp;	  		// dy_dMu
					}
				}

				else {														// Prony model reference

					if (i == 0) {											// Clear out dyda
						for (j = 0 ; j < NE ; j++)
							dy_dRef [j] = 0.;       			 		// NE ref params to clear
						for (j = 0 ; j < 3 ; j++)
							dy_dLam [j] = 0.;								// Three lam params to clear
					}

					dy_dRef [0] += Sigma [i];							// dy_dG0 or dy_dJ0
					for (j = 1 ; j < NE ; j++) {                 // Find remaining dY/dRef
						term = exp (- delta_Lam / Tau [j]);
						if (model == 2)									// Prony Modulus Model
							dy_dRef [j] += Sigma [i] * term;
						else                                      // Prony Compliance Model
							dy_dRef [j] += Sigma [i] * (1.-term);
					}

					term = 0.;												// Calculate dy_dt now
					for (j = 1 ; j < NE ; j++) {                 // and place in term
						tmp = exp (- delta_Lam / Tau [j]);
						if (model == 2)									// Prony Modulus Model
							term -= Coeff [j] / Tau [j] * tmp;
						else                                      // Prony Compliance Model
							term += Coeff [j] / Tau [j] * tmp;
					}

					for (j = 0 ; j < 3 ; j++) {
						tmp = dLambda_dt [j] - a [d + i*NP + j]; 		// dLam_t - dLam_Step
						dy_dLam [j] += Sigma [i] * term * tmp;	  		// dy_dMu/dteref/dt0
					}
				}

			}
		}
	}														  // End of Finding Reference Curve Section

	if (deriv == 1 && (eff_type == 2 || eff_type == 3) ) { 	// Finding ate curve
		for (i = 0 ; i < NL ; i++) {									// Loop over steps
			if (Lambda > LamStep [i]) {      					 	// Nothing to do if not so

				delta_Lam = Lambda - LamStep [i];					// Basic component

// First, clear out dy_dLam for subsequent additions if first step (i = 0)

				if (i == 0) 
					for (j = 0 ; j < NP+2 ; j++)
						dy_dLam [j] = 0.;							  	// NP+2 lam params to clear

// For this case, the reference is known.  Hence, we only need dRef_dt evaluated at
// the current delta_Lam - do this and place it in term

				if (model == 1) {										  	// Kohlrausch model
					Ka = Exp_Sign * pow (delta_Lam / KohlTau, Beta);
					Kb = exp (Ka);
					term = S0 * Beta / delta_Lam * Ka * Kb;		// dS_dt
				}

				else {
					term = 0.;												// Calculate dy_dt now
					for (j = 1 ; j < NE ; j++) {                 // and place in term
						tmp = exp (- delta_Lam / Tau [j]);
						if (model == 2)									// Prony Modulus Model
							term -= Coeff [j] / Tau [j] * tmp;
						else                                      // Prony Compliance Model
							term += Coeff [j] / Tau [j] * tmp;
					}
				}

// Now we can calculate the necessary dy_dLam terms - straightforward loop

				k = 0;
				if (eff_type == 3) {										// Combined case
					k = 3;
					for (j = 0 ; j < 3 ; j++) {
						tmp = dLambda_dt [j] - a [d + i*NP + j]; 	// dLam_t - dLam_Step
						dy_dLam [j] += Sigma [i] * term * tmp;	  	// dy_dMu/dteref/dt0
					}
				}

				for (j = k ; j < NP ; j++) {                		// Loop over L terms
					tmp = dLambda_dt [j] - a [d + i*NP + j];		// dLam_t - dLam_Step
					dy_dLam [j + 2] += Sigma [i] * term * tmp;	// dy_L_(j-k)
				}

			}
		}
	}														  		  // End of Finding ate Curve Section

// Now the value of y as well as all of the necessary derivatives dy_dLam, dy_dRef are
// completed.  Hence, free DMA and return

	free_dvector (dLambda_dt, 0);

	return;
}																		 // End Of Routine [Step_Response]


/***************************************************************************************

	calc_lambda_types: Calculates effective time and derivatives for LM solver

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine is used by STEP_RESPONSE to calculate the effective time and the
	derivatives (if necessary) of effective time wrt the parameters.  The derivatives are
	calculated if eff_type is positive, and are not if it is negative.

	t				The time to be solved at
	a     		The effective time parameters (points to a [c] from STEP_RESPONSE)
	y				Where to put the effective time Lambda (t)
	dyda			Where to put the derivatives dLam_dLamParam (t)
	eff_type    Positive if derivatives are to be found, negative if not
					Abs Value: 1=Standard, 2=CSF, 3=Combined Standard/CSF

	Roger Bradshaw, Northwestern University
	Completed: 15 Feb 97

***************************************************************************************/

void calc_lambda_types (double t, double *a, double *y, double *dyda, intL eff_type)
{
	intL derivs, NumLam, i;
	double *L, *Eta, LamStar, tmp, tJump;

// First decide it derivatives should be calculated or not

	derivs = 1;									// 1 means calculate, 2 means not
	if (eff_type < 0) {
		eff_type *= -1;
		derivs = 2;
	}

// Case 1: Standard Model Solution

	if (eff_type == 1)
		calc_lambda_standard (t, a [0], a [1], a [2], y, dyda, derivs);

// Case 2: CSF Model Solution

	if (eff_type == 2) {
		NumLam = a [0];
		LamStar = a [1];
		L = &a [2];
		Eta = &a [2 + NumLam];
		tJump = Eta [0];

		tmp = L [0];
		for (i = 1 ; i < NumLam ; i++)
			tmp += L [i] * (1. - exp (- (t + tJump) / Eta [i]));
		tmp = LamStar * exp (tmp);
		*y = tmp;

		if (derivs == 1) {
			dyda [0] = tmp;
			for (i = 1 ; i < NumLam ; i++)
				dyda [i] = tmp * (1. - exp (- (t + tJump) / Eta [i]));
		}
	}

// Case 3: Combined Model Solution

	if (eff_type == 3) {
		calc_lambda_standard (t, a [0], a [1], a [2], y, dyda, derivs);

		NumLam = a [3];
		LamStar = a [4];
		L = &a [5];
		Eta = &a [5 + NumLam];
		tJump = Eta [0];

		tmp = L [0];
		for (i = 1 ; i < NumLam ; i++)
			tmp += L [i] * (1. - exp (- (t + tJump) / Eta [i]));
		tmp = LamStar * exp (tmp);
		*y += tmp;

		if (derivs == 1) {
			dyda [3] = tmp;
			for (i = 1 ; i < NumLam ; i++)
				dyda [3 + i] = tmp * (1. - exp (- (t + tJump) / Eta [i]));
		}
	}

// Done so return

	return;
}																	// End Of Routine [calc_lambda_types]


/***************************************************************************************

	calc_lambda_standard: Calculates standard effective time, derivatives for LM solver

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine calculated the effective time and the derivatives of the effective time
	wrt each of the parameters (Mu, teref, te0) and places them in that order in dLam.
	This was created to account for the special case when Mu = 1 (which leads to 0/0
	difficulties).  In this case, the values of Mu inside of [1 - Eps, 1 + Eps] are
	found by solving for the results using Mu = 1 + Eps and Mu = 1 - Eps and then
	interpolating appropriately.  In this case, this routine calls itself recursively.

	Roger Bradshaw, Northwestern University
	Code Completed: 15 Feb 1997

***************************************************************************************/

void calc_lambda_standard (double t, double Mu, double teref, double te0, double *Lam,
									double *dLam, intL derivs)
{
	intL i;
	double A, B, C, D, E, F, G, Lam1, *dLam1, Lam2, *dLam2, Eps, tmp;

	Eps = 0.005;

	if (fabs (Mu - 1.) > Eps / 1.0001) {	// Standard Approach Below Is Good Enough
														// Use 1.0001 to ensure OK in recursion below
		G = 1. - Mu;                  		// Simplifying constants
		A = teref / (te0 + t);
		B = pow (A, -G);
		C = B * A;
		D = 1. + t / te0;
		E = log (D);
		F = pow (D, -G);

		*Lam = (te0 + t) / G * C * (1. - F);

		if (derivs == 1) {
			tmp = (1. - F) * (1. / G + log (teref / te0));
			dLam [0] = (te0 + t) / G * C * (tmp - E);	  							// dLam_dMu
			dLam [1] = Mu / G * B * (1. - F);			  							// dLam_dteref
			dLam [2] = C - pow (teref / te0, Mu);		  							// dLam_dte0
		}
	}

	else {				// Recursively call this routine for Mu = 1 +/- Eps and Interpolate
		dLam1 = dvector (0, 2);
		dLam2 = dvector (0, 2);

		calc_lambda_standard (t, 1. - Eps, teref, te0, &Lam1, dLam1, derivs);
		calc_lambda_standard (t, 1. + Eps, teref, te0, &Lam2, dLam2, derivs);

		*Lam = Linear_Interpolation (Mu, 1. - Eps, Lam1, 1. + Eps, Lam2);
		if (derivs == 1)
			for (i = 0 ; i < 3 ; i++)
				dLam [i] = Linear_Interpolation (Mu, 1.-Eps, dLam1 [i], 1.+Eps, dLam2 [i]);

		free_dvector (dLam1, 0);
		free_dvector (dLam2, 0);
	}

	return;
}																// End Of Routine [calc_lambda_standard]


/***************************************************************************************

	set_step_response_size: Determines size of a, dyda for use in Step_Response

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

	This routine calculates the size and locations inside of the vectors a, dyda for the
	step_response code for the various input cases possible.  The values A, B, C, D are
	returned, which set the size of a, dyda as well as indicating where specific
	information should go.  For a complete description, see Step_Response.

	Roger Bradshaw, Northwestern University
	Completed: 27 Feb 1997

***************************************************************************************/

void set_step_response_size (intL Code, intL NL, intL NE, intL NA,
									  intL *A, intL *B, intL *C, intL *D)
{
	intL i, deriv, model, eff_type;

// First evaluate the solution code

	i = Code;										// Set the effective time model being used
	eff_type = i % 10;
	if (eff_type < 1 || eff_type > 3)
		nrerror ("\nEffective Time Model Code Must Be 1-3 In set_step_response_size\n");

	i /= 10;
	model = i % 10;								// Set the material model being used
	if (model < 1 || model > 3)
		nrerror ("\nMaterial Model Code Must Be 1-3 In set_step_response_size\n");

	deriv = i / 10;                        // Set whether to find the derivatives or not
	if (deriv < 1 || deriv > 2)
		nrerror ("\nDerivative Code Must Be 1-2 In set_step_response_size\n");

// Now the values of A, B, C, D can be set

	*A = 3 + 3 * NL;												// Step information

	if (model == 1)												// Kohlrausch model
		*B = 4;
	else																// Prony compliance/modulus model
		*B = 1 + 2 * NE;

	if (eff_type == 1)
		*C = 3;														// Standard effective time
	if (eff_type == 2)
		*C = 2 + 2 * NA;											// CSF method
	if (eff_type == 3)
		*C = 5 + 2 * NA;											// Combined standard/CSF method

	*D = 0;
	if (deriv == 1) {
		if (eff_type == 1)
			*D = 3;
		if (eff_type == 2)
			*D = NA;
		if (eff_type == 3)
			*D = 3 + NA;
	}
	*D *= NL;

	return;
}


/***************************************************************************************

	Create_Prony_SVD_Step

	This routine is given a set of experimental data created using a series of step loads
	which occur at experiment times steps, which had magnitude of sigma.  It then finds
	the best Prony series to fit this data using the SVD solver algorithm.  Effective
	time (if it is used) has already been eliminated (by mapping the data into effective
	time space) prior to entering this routine.

	Note that the Prony series used is a modulus type. Since SVD does not care about the
	sign of each coefficient, the resulting function would be identical if the solution
	method was recast in terms of a compliance Prony series.

	This routine acts as it used to, except that YPred [0] can now be used to curtail
	the actions of this routine as:

		YPred [0] = -1.			Do not print and do not solve for predicted response
		YPred [0] = -2.			Do not print but do solve for predicted response

	Other codes could be passed as well

	Roger Bradshaw, Northwestern University
	Code Created: Fall 1996
	Code Modified: 3 March 1997
	Code Updated: 17 Jan 1998	Modified names and added note above (changed looks only)
	Code Updated: 20 Jan 1998	Added new no print flag which does predicted response

***************************************************************************************/

void Create_Prony_SVD_Step (intL NumPts, double *XD, double *YD, double *SD,
									 intL NumElems, double Tau_Min, double Tau_Max,
									 double *Coeff, double *Tau, double *RMS, double *steps,
									 double *sigma, intL NumSteps, double *YPred)
{
	intL i, j, print_status = 0, solve_pred = 0;
	double *CoeffAll, *basis;

	if (YPred [0] == -1.) {		// No printing is desired by user
		print_status = 1;			// Disables printing in this routine
		solve_pred = 1;			// Disables prediction of solution in this routine
		*RMS = -1.;					// Disables printing in SVDFIT
	}

	if (YPred [0] == -2.) {		// No printing is desired by user
		print_status = 1;			// Disables printing in this routine
		*RMS = -1.;					// Disables printing in SVDFIT
	}

	if (print_status != 1)
		printf ("Prony Series SVD Solution\n");

// Create the Tau vector based on Tau_Min, Tau_Max, evenly spaced in log time

	Set_Relaxation_Times (NumElems, Tau, Tau_Min, Tau_Max);

// Will solve for CoeffAll - use second half to pass Tau values and all step information
// to Prony_Basis_Step as welll

	CoeffAll = dvector (0, 2 * (NumElems + NumSteps));
	for (i = 0 ; i < NumElems ; i++)
		CoeffAll [NumElems + i] = Tau [i];
	CoeffAll [2 * NumElems] = NumSteps + 0.001;
	for (i = 0 ; i < NumSteps ; i++) {
		CoeffAll [2 * NumElems + 1 + i] = steps [i];
		CoeffAll [2 * NumElems + NumSteps + 1 + i] = sigma [i];
	}

// Now we have the data points, the relaxation times - solve using svdfit

	svdfit (XD, YD, SD, NumPts, CoeffAll, NumElems, RMS, Prony_Basis_Step);

// Solve for the RMS % error

	*RMS /= NumPts;
	*RMS = 100. * sqrt (*RMS);  // Convert it to RMS % error

// Move coefficients to proper locations

	for (i = 0 ; i < NumElems ; i++)
		Coeff [i] = CoeffAll [i];

// Solve for the predicted response (only if desired)

	if (solve_pred != 1) {
		basis = dvector (0, NumElems-1);
		for (i = 0 ; i < NumPts ; i++) {
			Prony_Basis_Step  (XD [i], basis, CoeffAll, NumElems);
			YPred [i] = Coeff [0] * basis [0];
			for (j = 1 ; j < NumElems ; j++)
				YPred [i] += Coeff [j] * basis [j];
		}
		free_dvector (basis, 0);
		printf ("RMS %10.4E\n", *RMS);
	}

	free_dvector (CoeffAll, 0);

	return;

}


/***************************************************************************************

	Prony Series Basis Functions Evaluation Routine When Load Steps Are Used
	Values for Tau and Steps are beyond coefficients in CoeffTau

	CoeffTau [0 - NumElems-1] = Coeffs
	CoeffTau [NumElems - 2*NumElems-1] = Taus
	CoeffTau [2*NumElems] = Number Of Steps
	CoeffTau [2*NumElems+1 - 2*NumElems+NumSteps] = Time At Which Step Occurs
	CoeffTau [2*NumElems+NumSteps+1 - 2*NumElems+2*NumSteps] = Step Magnitude

	This assumes that the fit function is given by:

		S(t) = Sum_i Sum_j Coeff_i * Mag_j * H (t - steps_j) exp [- (t - steps_j) / Tau_i]

	where i is looping over the coefficients and j is looping over the steps.  For the
	typical sequence test, Mag_j = (-1)^j.

	Clearly, then, the ith basis function is given by:

		Basis_i (t) = Sum_j Mag_j * H (t - steps_j) exp [- (t - steps_j) / Tau_i]

***************************************************************************************/

void Prony_Basis_Step (double t, double *basis, double *CoeffTau, intL NumElems)
{
	intL i, j, NumSteps;
	double steps_j, sigma_j;

	NumSteps = CoeffTau [2 * NumElems];

	for (i = 0 ; i < NumElems ; i++) {
		basis [i] = 0.;
		for (j = 0 ; j < NumSteps ; j++) {
			steps_j = CoeffTau [2 * NumElems + 1 + j];
			if (t >= steps_j) {	// Only consider if so
				sigma_j = CoeffTau [2 * NumElems + NumSteps + 1 + j];
				if (i != 0)
					basis [i] += sigma_j * exp (- (t - steps_j) / CoeffTau [NumElems + i]);
				else
					basis [i] += sigma_j;
			}
		}
	}

	return;
}


/***************************************************************************************

	Simple_Prony_Sign_Solution		Simple solution for a sign controlled Prony series

	This routine is passed data which can be fit using a sign controlled Prony series.
	This routine sets the relaxation times, determines the guess, and determines the
	coefficients - all without involving the user and without any printout.

	Added extra feature: if NumElems is negative, the constant coefficient is to remain
								fixed in this solution.

	Added extra feature: user can pass Tau limits (see below)

	Roger Bradshaw, Northwestern University
	Code Completed: 17 March 1997
	Updated:			 20 April 1997		To fix Coeff_0 using -NumElems
	Updated:			 28 May 1997		Changed name (from _Compliance to _Solution) and
												added functionality to also fit modulus data.  If
												modulus data is passed, set gamma to -gamma.
	Updated:			 29 May 1997		If Tau [0] = -1., the routine takes Tau_Min and
												Tau_Max from Tau [1] and Tau [NumElems-1], resp.
	Updated:			 24 May 1998		Changed standard deviation from data to 1 (unless
												RMS = -1. in which case data is used). Also added
												RMS_Mult to multiply by 1 if unity and 100 (for %)
												if data for std_dev

***************************************************************************************/

void Simple_Prony_Sign_Solution (intL NumElems, double *Coeff, double *Tau,
											double gamma, intL NumPts, double *t, double *J,
											double *RMS)
{
	intL i, nvar, *avar, fix_coeff, model;
	double A, B, C, *a, *p, i_chisq, chisq, Tau_Min, Tau_Max, Coeff0, *std_dev, RMS_Mult;
	char message [80];

// Check if constant coefficient should be fixed

	fix_coeff = 0;						// For 0, all coeffs float
	if (NumElems < 0) {
		fix_coeff = 1;             // For 1, Coeff_0 is fixed
		NumElems *= -1;
		Coeff0 = Coeff [0];
	}

// Check if compliance data (model = 1) or modulus data (model = 2) - passed by gamma

	model = 1;
	if (gamma < 0) {
		model = 2;
		gamma *= -1.;
	}

// Create standard deviation vector

	RMS_Mult = 1.;
	std_dev = dvector (0, NumPts-1);
	for (i = 0 ; i < NumPts ; i++) {
		if (*RMS != -1.)
			std_dev [i] = 1.;
		else {
			std_dev [i] = J [i];
			RMS_Mult = 100.;
		}
	}

// First, set Tau_Min, Tau_Max

	if (Tau [0] < -1.0001 || Tau [0] > -0.9999) {	// Set Tau_Min/Max from time values
		if (t [0] > 0.)
			Tau_Min = t [0] / gamma;
		else
			Tau_Min = t [1] / gamma;
		Tau_Max = t [NumPts-1] * gamma;
	}

	else {
		Tau_Min = Tau [1];
		Tau_Max = Tau [NumElems-1];
	}

	if (Tau_Min <= 0.)
		nrerror ("\nMinimum relaxation time limit in Simple_Prony_..."
					" must be positive - correct\n");

	if (Tau_Max <= 0.)
		nrerror ("\nMaximum relaxation time limit in Simple_Prony_..."
					" must be positive - correct\n");

// Now create the guess using A, B, C - works for both modulus and compliance data

	if (J [NumPts-1] < J [0] && model == 1)
		nrerror ("\nSimple_Prony_Sign_Solution (compliance) needs ever increasing data"
					" - correct\n");

	if (J [NumPts-1] > J [0] && model == 2)
		nrerror ("\nSimple_Prony_Sign_Solution (modulus) needs ever decreasing data"
					" - correct\n");

	A = 0.8;
	B = 2.;
	C = fabs (log10 (J [NumPts-1] / J [0])) / 20.;

	Perform_Guess_Calc (model, J [0], J [NumPts-1], A, B, C, Tau_Min, Tau_Max,
							  NumElems, Coeff, Tau);

// Now set up L-M solution parameters

	a = dvector (0, 2 + 2 * NumElems);
	avar = ivector (0, 2 + 2 * NumElems);

// Distribute coefficients into a for use by LM solver when we allow for sign control

	a [0] = NumElems + 0.001;
	for (i = 0 ; i < NumElems ; i++) {
		if (i == 0 && fix_coeff == 1)
			a [1 + i] = Coeff0;
		else
			a [1 + i] = Coeff [i];
		a [1 + NumElems + i] = Tau [i];
	}
	a [1 + 2 * NumElems] = t [0];				// First time point for sign control
	a [2 + 2 * NumElems] = model + 0.001;	// Compliance/Modulus flag

	if (fix_coeff == 0) {
		nvar = NumElems;							// The number of varying coefficients
		for (i = 0 ; i < NumElems ; i++)
			avar [i] = i + 1;
	}

	else {
		nvar = NumElems - 1;						// The number of varying coefficients
		for (i = 1 ; i < NumElems ; i++)
			avar [i-1] = i + 1;
	}

// Set up solution method

	p = dvector (0, 4);
	p [0] = -1.;			   // This tells it to use these params not defaults
	p [1] = 20.001;			// Allow to run 20 iterations before loosening tolerance
	p [2] = 0.0005;			// ConvR: Convergence ratio which is acceptable
	p [3] = 1.;					// StdDevPct = 1.
	p [4] = 1.;					// Use RMS convergence criterion

	sprintf (message, "NoPrint");
	LM_Subset (t, J, std_dev, NumPts, a, 3 + 2 * NumElems, avar, nvar,
				  &chisq, &i_chisq, Prony_Sign_Eval, message, p);
	*RMS = RMS_Mult * sqrt (chisq / NumPts);

	for (i = 0 ; i < NumElems ; i++)
		Coeff [i] = a [1 + i];

	free_dvector (a, 0);
	free_dvector (p, 0);
	free_ivector (avar, 0);

	return;
}


/***************************************************************************************

	Kohlrausch_Time	Find S0, Tau, Beta for a single set of data in real time (no steps)

	This routine is passed a set of data and returns the best S0, Tau, Beta to fit it.

		a [0] = S0		a [1] = Tau		a [2] = Beta		a [3] = Sign		a [4] = chisq

	The sign value should already be set to 1 (compliance) or -1 (modulus) prior to
	entering this routine.  If it is not approximately so, this program exits in error.

	If a [4] = 1. upon entering this routine, only the best value for Tau is found with
	S0 and Beta fixed, and Tau contains its initial guess upon entering.

***************************************************************************************/

void Kohlrausch_Time (double *a, intL NumPts, double *t, double *comp, double *std_dev)
{
	intL j, k, *avar, nvar;
	double tmp1, chisq, i_chisq, c1, c2, comp_mid, comp_end;
	char message [80];

	if (fabs (fabs (a [3]) - 1.) > 0.001)
		nrerror ("\nSign parameter must be -1 or 1 in Kohlrausch_Time\n");

// First, set S0, Tau, Beta guesses based on first, middle and last data points

	if (a [4] != 1.) {
		a [0] = 0.5 * (comp [0] + comp [1]);	// Assume S0 given by the earliest 2 points

		j = NumPts-1;  	// Use the last point and the middle point to guess Tau, Beta
		k = j / 2;

		comp_mid = 0.25 * (comp [k-1] + 2. * comp [k] + comp [k+1]);
		comp_end = 0.5 * (comp [j-1] + comp [j]);

		if (a [3] == 1.) {
			if (a [0] > comp_mid || comp_mid > comp_end)
				error_with_ignore ("\nCannot determine Kohlrausch guess for this"
										 " compliance data as it decreases\n");
		}

		else {
			if (a [0] < comp_mid || comp_mid < comp_end)
				error_with_ignore ("\nCannot determine Kohlrausch guess for this"
										 " modulus data as it increases\n");
		}

		c1 = log ( log (comp_mid / a  [0]) / a [3]);	 	// Value for middle point
		c2 = log ( log (comp_end / a  [0]) / a [3]);		// Value for end point

		a [1] = c2 * log (t [k]) - c1 * log (t [j]);
		a [1] = exp (a [1] / (c2 - c1));						// This is the estimate for Tau

		a [2] = c1 / log (t [k] / a [1]);					// This is the estimate for beta
	}

// Now we have our guesses for S0, Tau, Beta so solve for them using L-M method
// [NOTE: By setting nvar to a negative value (-3), the L-M solver prevents any of the
// values S0, Tau, or Beta from adopting a negative value by limiting jump size]

	avar = ivector (0, 4);

	if (a [4] != 1.) {
		nvar = -3;		// The number of varying coefficients
		avar [0] = 0;  // Place the value of the 1st varying coeff here, S0
		avar [1] = 1;  // Place the value of the 2nd varying coeff here, Tau
		avar [2] = 2;  // Place the value of the 3rd varying coeff here, Beta
	}

	else {
		nvar = -1;		// The number of varying coefficients
		avar [0] = 1;  // Place the value of the only varying coeff here, Tau
	}

	tmp1 = 0.;		// Tell LM solver to use default solution method
	sprintf (message, "NoPrint");  // Tells the solver to not print sol'n status

	Levenberg (t, comp, std_dev, NumPts, a, 4, avar, nvar, &chisq, &i_chisq,
				  Kohlrausch, message, &tmp1);  // Call L-M solver

	a [4] = chisq;

	return;
}																				 // End Of [Kohlrausch_Time]


/*************************************************************************************

	The function below calculates the values of the Kohlrausch model:

		a [0] = S0 ; a [1] = Tau ; a [2] = Beta ; a [3] = sign

		f (x) = S0 * exp [sign * (x / Tau) ^ Beta ]

	The value of the function and the first partial derivatives are solved for at the
	location x, and stored then in y, dyda.  This function is used with mrqmin.

*************************************************************************************/

void Kohlrausch (double x, double *a, double *y, double *dyda)
{
	double alpha, beta, delta, epsilon, phi;

	alpha = x / a [1];				  		// alpha = t / a1
	beta = a [3] * pow (alpha, a [2]);	// beta = sign * alpha ^ a2
	delta = exp (beta);   			  		// delta = exp ( alpha ^ a2)
	epsilon = beta * delta;			  		// epsilon = (alpha ^ a2) * exp ( alpha ^ a2)
	phi = log (alpha);				  		// phi = ln (alpha)

	*y = a [0] * delta;				  		// Put value into location needed

	dyda [0] = delta;   												// dy/dA0
	dyda [1] = - a [0] * a [2] / a [1] * epsilon;			// dy/dA1
	dyda [2] = a [0] * phi * epsilon;							// dy/dA2

	return;
}																		    // End Of Routine [Kohlrausch]

/*************************************************************************************

	The function is given a set of data (t, y, std) containing NumPts data points and
	creates a data subset (tsub, ysub, stdsub) containing NumSub data points. Checks
	are made to ensure that the subset points stay within the original data set.
	
	Roger Bradshaw, University of Washington
	Code Completed: 17 Jan 1998

*************************************************************************************/

void Create_Data_Subset (intL NumPts, double *t, double *y, double *std,
								 intL NumSub, double *tsub, double *ysub, double *stdsub)
{
	intL i, k;
	double step_val;
	
	if (NumSub > NumPts)
		nrerror ("Number of subset points exceeds total number in Create_Data_Subset - correct");

	if (NumSub < 3 || NumPts < 3)
		nrerror ("Create_Data_Subset requires at least 3 points to be used - correct");

	tsub [0] = t [0];										// First point is the same
	ysub [0] = y [0];
	stdsub [0] = std [0];

	tsub [NumSub - 1] = t [NumPts - 1];				// Last point is the same
	ysub [NumSub - 1] = y [NumPts - 1];
	stdsub [NumSub - 1] = std [NumPts - 1];

	step_val = (NumPts - 1.) / (NumSub - 1.);		// Scaling value (double)

	for (i = 1 ; i < NumSub -1 ; i++) {				// Set remaining middle points
		k = i * step_val;									// k = orig vector index for subset pt i
		tsub [i] = t [k];
		ysub [i] = y [k];
		stdsub [i] = std [k];
	}

	return;
}


/***************************************************************************************

	Calc_W_Space	Calculates mapping of time space to step space

	This routine will map the time vector and the step vector into a new W (step) space.
	Each value W returned will consist of an integer = step number (1, 2, 3...) + a
	fractional amount [0, 1) corresponding to the amount into the step we are.

	Roger Bradshaw, Northwestern University
	Code Completed: 2 April 1997
	Code Moved: 16 Feb 1997		Moved to Visual C++ files and rewrote to use step counter
	Code Moved: 17 Feb 1997		Changed step counter limit to NumSteps-1

***************************************************************************************/

void calc_w_space (intL NumPts, double *w, double *t, intL NumSteps, double *steps,
						 double te0, double W0, double D)
{
	intL i, j, count, *stepcount;
	char message [200];

	stepcount = ivector (0, NumSteps-1);									// Declare pts / step
	count_step_points (t, NumPts, steps, NumSteps, stepcount, 0);	// Count them

	count = 0;
	for (i = 0 ; i < NumSteps-1 ; i++) {

		if (stepcount [i] != 0) {
			for (j = 0 ; j < stepcount [i] ; j++)
				w [count + j] = calc_w_point (t [count + j] + te0, steps [i] + te0,
														steps [i+1] + te0, W0, D, i);
		}
		else {
			sprintf (message, "Step %d contains no data points in it", i+1);
			error_with_ignore (message);
		}

		count += stepcount [i];	
	}

	free_ivector (stepcount, 0);

	return;
}


/***************************************************************************************

	Calc_W_Point	Calculates mapping of time space to step space

	Calculates the value fo w for step0 < t < step1. W0 is the value for the value of 
	the first point in the entire set (usually 0) and D is the width of each segment
	(usually 1).

	Roger Bradshaw, Northwestern University
	Code Completed: 2 April 1997
	Code Moved: 16 Feb 1997		Moved to Visual C++ files and wrote comments

***************************************************************************************/

double calc_w_point (double t, double step0, double step1, double W0, double D, intL i)
{
	double w;

	w = i * log10 (step1) + log10 (t) - (i + 1.) * log10 (step0);
	w /= log10 (step1) - log10 (step0);
   w = W0 + D * w;

	return w;
}

/***************************************************************************************

	Kohlrausch_To_Prony_SVD		Converts Kohlrausch function to Prony series via SVD

	Roger Bradshaw, Boeing Commercial Airplane Group
	Code Completed: 24 May 1998

***************************************************************************************/

double Kohlrausch_To_Prony_SVD (double S0K, double TauK, double BetaK, intL CompMod,
										  intL NumPts, double ps, double pe,
							 			  intL NumElems, double **Tau, double **CoeffSVD)
{
	intL i;
	double *tV, *SV, tmp, RMS;

	*CoeffSVD = dvector (0, NumElems-1);					// Prony series solution vectors
	*Tau = dvector (0, NumElems-1);					

	tV = dvector (0, NumPts-1);
	SV = dvector (0, NumPts-1);

	tmp = (pe - ps) / (NumPts - 1.);
	for (i = 0 ; i < NumPts ; i++) {
		tV [i] = pow (10., ps + tmp * i);
		if (CompMod == 1)
			SV [i] = S0K * exp (pow (tV [i] / TauK, BetaK));
		else
			SV [i] = S0K * exp (-pow (tV [i] / TauK, BetaK));
	}

	Create_Prony_SVD (NumPts, tV, SV, NumElems, pow (10., ps), pow (10., pe), 
							*CoeffSVD, *Tau, &RMS);

	return RMS;
}


/***************************************************************************************

	Prony_To_Kohlrausch		Converts Prony series function to Kohlrausch function via LM

	Roger Bradshaw, Boeing Commercial Airplane Group
	Code Completed: 24 May 1998

***************************************************************************************/

double Prony_To_Kohlrausch (double *S0K, double *TauK, double *BetaK, intL CompMod,
									 intL NumPts, double ps, double pe,
							 		 intL NumElems, double *Tau, double *Coeff)
{
	intL i, j;
	double *tV, *SV, tmp, RMS, *a, *std_dev;

	tV = dvector (0, NumPts-1);
	SV = dvector (0, NumPts-1);
	a = dvector (0, 4);

	tmp = (pe - ps) / (NumPts - 1.);				// Make the data to be fit
	for (i = 0 ; i < NumPts ; i++) {
		tV [i] = pow (10., ps + tmp * i);
		SV [i] = Coeff [0];
		for (j = 1 ; j < NumElems ; j++) {
			if (CompMod == 1)
				SV [i] += Coeff [j] * (1. - exp (-tV [i] / Tau [j]));
			else
				SV [i] += Coeff [j] * exp (-tV [i] / Tau [j]);
		}
	}

// Set up solution vector

	if (CompMod == 1)			// Sign term for Kohlrausch function
		a [3] = 1.;
	else
		a [3] = -1.;
	a [4] = 0.;					// Solve for everything

	std_dev = dvector (0, NumPts-1);
	for (i = 0 ; i < NumPts ; i++)
		std_dev [i] = 1.;

// Solve for Kohlrausch function

	Kohlrausch_Time (a, NumPts, tV, SV, std_dev);

// Recover solution parameters

	*S0K = a [0];
	*TauK = a [1];
	*BetaK = a [2];
	
	RMS = sqrt (a [4] / NumPts);

// Free vectors and return

	free_dvector (tV, 0);
	free_dvector (SV, 0);
	free_dvector (std_dev, 0);
	free_dvector (a, 0);

	return RMS;
}



/***************************************************************************************/

// This routine is passed compliance data, along with the Prony series reference curve
// and the stress/step data which created it.  Also passed is a sign control Prony
// series for the natural log of the effective time.  This routine then finds the
// optimal Prony coefficients for the natural log of the effective time which best
// satisfy the known compliance result.  This is accomplished by an LM solver method.
// Upon completion, the predicted compliance function is returned.  Pass Lam_Min via
// RMS.

void Fit_Prony_Eta_Compliance (intL NumElems, double *Coeff, double *Tau, intL NumSteps,
										 double *Sigma, double *Steps, intL NumEta, double *Eff,
										 double *Eta, intL NumPts, double *t, double *J,
										 double *JFit, double *RMS)
{
	intL i, j, nvar, *avar;
	double *a, **covar, *p, i_chisq, chisq;
	char message [80];

// Start by setting up the L-M solution parameters

	i = 5 + 2 * (NumElems + NumSteps + NumEta);
	a = dvector (0, i - 1);
	avar = ivector (0, i - 1);
	covar = dmatrix (0, i - 1, 0, i - 1);

// Distribute coefficients into a for use by LM solver when we allow for sign control

	a [0] = NumEta + 0.001;
	a [1] = NumElems + 0.001;
	a [2] = NumSteps + 0.001;
	a [3] = t [0];
	a [4] = *RMS;	// Pass Lam_Min via this parameter

	j = 5;
	for (i = 0 ; i < NumEta ; i++) {
		a [j + i] = Eff [i];
		a [j + NumEta + i] = Eta [i];
	}

	j = 5 + 2 * NumEta;
	for (i = 0 ; i < NumElems ; i++) {
		a [j + i] = Coeff [i];
		a [j + NumElems + i] = Tau [i];
	}

	j = 5 + 2 * (NumEta + NumElems);
	for (i = 0 ; i < NumSteps ; i++) {
		a [j + i] = Sigma [i];
		a [j + NumSteps + i] = Steps [i];
	}

	nvar = NumEta;	  							// The number of varying coefficients
	for (i = 0 ; i < NumEta ; i++)
		avar [i] = 5 + i;

// Set up solution method

	p = dvector (0, 4);
	p [0] = -1.;			   // This tells it to use these params not defaults
	p [1] = 20.001;			// Allow to run 20 iterations before loosening tolerance
//	p [2] = 0.0005;			// ConvR: Convergence ratio which is acceptable
	p [2] = 0.005;			// ConvR: Convergence ratio which is acceptable
	p [3] = 1.;					// StdDevPct = 1.
	p [4] = 1.;					// Use RMS convergence criterion

/*	printf ("\n");
	for (i = 0 ; i < NumPts ; i++) {
		a [3] = -1.;	// Don't calculate the derivatives
		Prony_Eta_Compliance_Sign_Control (t [i], a, &JFit [i], &i_chisq);
		printf ("\rCompliance Solution For Point %4d = %16.8E vs %16.8E", i, J [i], JFit [i]);
		getch();
	}
	return;
*/
	i = 5 + 2 * (NumElems + NumSteps + NumEta);
	sprintf (message, "@00@Eta At t=Infinity %%12.5E   RMS %%12.5E   ");
	Levenberg (t, J, J, NumPts, a, i, avar, nvar, &chisq, &i_chisq,
				  Prony_Eta_Compliance_Sign_Control, message, p);
	*RMS = 100. * sqrt (chisq / NumPts);

// Now solve for the smoothed compliance

	a [3] = -1.;	// Don't calculate the derivatives
	for (i = 0 ; i < NumPts ; i++)
		Prony_Eta_Compliance_Sign_Control (t [i], a, &JFit [i], &i_chisq);

// Done so free DMA and return

	free_dvector (a, 0);
	free_dvector (p, 0);
	free_ivector (avar, 0);
	free_dmatrix (covar, 0, 1 + 2 * NumElems, 0);

	return;
}




// This routine calculates the compliance when given the natural log of the effective
// time as a Prony series, the load as a series of steps, and the reference curve as a
// Prony series.  The compliance and its derivative wrt the effective time coefficients
// are calculated.

void Prony_Eta_Compliance_Sign_Control (double t, double *a, double *y, double *dyda)
{
	intL i, j, k, NumElems, NumEta, NumSteps, calc_deriv = 0;
	double *Coeff, *Tau, *Sigma, *Steps, *Eff, *Eta, tfirst, temp, Lam_Min;
	double Eta_t, Eta_s, Lam_t, Lam_s, del_Lam, *dLam_dH_s, *dLam_dH_t;

// Set pointers and values

	NumEta = a [0];
	NumElems = a [1];
	NumSteps = a [2];
	tfirst = a [3];
	Lam_Min = a [4];

	Eff = &a [5];
	Eta = &a [5 + NumEta];

	Coeff = &a [5 + 2 * NumEta];
	Tau   = &a [5 + 2 * NumEta + NumElems];

	Sigma = &a [5 + 2 * NumEta + 2 * NumElems];
	Steps = &a [5 + 2 * NumEta + 2 * NumElems + NumSteps];

	dLam_dH_t = dvector (0, NumEta - 1);
	dLam_dH_s = dvector (0, NumEta - 1);

	if (tfirst != -1.) {							// Enforce sign control
		if (t <= tfirst * 1.001)
			for (i = 0 ; i < NumElems ; i++)
				Eff [i] = fabs (Eff [i]);
	}
	else
		calc_deriv = 1;							// Do not calculate derivatives / sign control

	*y = 0.;                          		// Zero as necessary
	if (calc_deriv == 0)
		for (i = 0 ; i < 5 + 2 * NumEta + 2 * NumElems + 2 * NumSteps ; i++)
			dyda [i] = 0.;

	for (i = 0 ; i < NumSteps ; i++)			// Set result due to constant term
		if (t >= Steps [i])
			*y += Coeff [0] * Sigma [i];

// Some information can be calculated now.  Begin with Eta and dLam_dH at t

	Eta_t = Eff [0];
	for (k = 1 ; k < NumEta ; k++)
		Eta_t += Eff [k] * (1. - exp (- t / Eta [k]));

	Lam_t = Lam_Min * exp (Eta_t - 1.);

	dLam_dH_t [0] = Lam_t;
	for (k = 1 ; k < NumEta ; k++)
		dLam_dH_t [k] = Lam_t * (1. - exp (- t / Eta [k]));

// Now the remaining information is found by looping over the number of steps
// and number of reference elements

	for (i = 0 ; i < NumSteps ; i++) {

		if (t >= Steps [i]) {				// Further calculation only needed in this case

/*			if (i == 0)	{						// First step known since at time 0
				Lam_s = 0.;
				for (k = 0 ; k < NumEta ; k++)
					dLam_dH_s [k] = 0.;
			}

			else {  */
				Eta_s = Eff [0];					// Calculate Eta at the step value
				for (k = 1 ; k < NumEta ; k++)
					Eta_s += Eff [k] * (1. - exp (- Steps [i] / Eta [k]));

				Lam_s = Lam_Min * exp (Eta_s - 1.);

				dLam_dH_s [0] = Lam_s;
				for (k = 1 ; k < NumEta ; k++)
					dLam_dH_s [k] = Lam_s * (1. - exp (- Steps [i] / Eta [k]));
//			}

			del_Lam = Lam_t - Lam_s;

			for (j = 1 ; j < NumElems ; j++) {
				temp = Sigma [i] * Coeff [j] * exp (- del_Lam / Tau [j]);
				*y += temp;
				if (calc_deriv == 0)
					for (k = 0 ; k < NumEta ; k++)
						dyda [5 + k] -= temp / Tau [j] * (dLam_dH_t [k] - dLam_dH_s [k]);
			}
		}

		else
			i = NumSteps;
	}

	free_dvector (dLam_dH_t, 0);
	free_dvector (dLam_dH_s, 0);

	return;
}




// This routine is passed data which can be fit with a compliance Prony series with sign
// control (all of the coefficients are positive).  The relaxation times are set, and
// the guess is made in this routine.  The Prony series which satifies is found and
// returned .  The function being fit must be ever-increasing for this approach to work
/*	a [0]											Number of Elements in Prony series (NumElems)
	a [1 .. NumElems]             		Coefficients of Prony Series
	a [NumElems+1 .. 2*NumElems]        Relaxation/Retardation times of Prony series
	a [2*NumElems+1]							Time of first data point (for sign control)
	a [2*NumElems+2]							Compliance (1) or Modulus (2)

*/
void Fit_Compliance_Prony (intL NumElems, double *Coeff, double *Tau, double gamma,
									intL NumPts, double *t, double *J, double *RMS)
{
	intL i, nvar, *avar;
	double A, B, C, *a, **covar, *p, i_chisq, chisq;
	char message [80];

// First, set the relaxation times

	if (t [0] > 0.)
		Set_Relaxation_Times (NumElems, Tau, t [0] / gamma, t [NumPts-1] * gamma);
	else
		Set_Relaxation_Times (NumElems, Tau, t [1] / gamma, t [NumPts-1] * gamma);

// Now create the guess using A, B, C

	A = 0.5;
	B = 2.;
	Coeff [0] = -1.;
	Coeff [1] = J [0];
	Coeff [2] = J [NumPts-1];
	if (Coeff [2] < Coeff [1])
		nrerror ("\nRoutine Fit_Compliance_Prony needs ever increasing data - correct\n");
	else
		C = log10 (Coeff [2] / Coeff [1]) / 20.;

	Set_Prony_Guess (NumElems, Coeff, Tau, Coeff, 0., 0., A, B, C);

	for (i = 1 ; i < NumElems ; i++) {  // Correct to compliance type Prony series
		Coeff [0] += Coeff [i];
		Coeff [i] *= -1.;
	}

// Now set up L-M solution parameters

	a = dvector (0, 1 + 2 * NumElems);
	avar = ivector (0, 1 + 2 * NumElems);
	covar = dmatrix (0, 1 + 2 * NumElems, 0, 1 + 2 * NumElems);

// Distribute coefficients into a for use by LM solver when we allow for sign control

	a [0] = NumElems + 0.001;
	nvar = NumElems;	  							// The number of varying coefficients
	for (i = 0 ; i < NumElems ; i++) {
		a [1 + i] = Coeff [i];
		a [1 + NumElems + i] = Tau [i];
		avar [i] = i + 1;
	}
	if (*RMS != -1.)
		a [1 + 2 * NumElems] = t [0];
	else
		a [1 + 2 * NumElems] = -1.;

// Set up solution method

	p = dvector (0, 4);
	p [0] = -1.;			   // This tells it to use these params not defaults
	p [1] = 20.001;			// Allow to run 20 iterations before loosening tolerance
	p [2] = 0.0005;			// ConvR: Convergence ratio which is acceptable
	p [3] = 1.;					// StdDevPct = 1.
	p [4] = 1.;					// Use RMS convergence criterion

	sprintf (message, "X At t=0 %%12.5E  RMS %%12.5E   ");
	Levenberg (t, J, J, NumPts, a, 2 + 2 * NumElems, avar, nvar,
				  &chisq, &i_chisq, Prony_Compliance_Sign_Control, message, p);
	*RMS = 100. * sqrt (chisq / NumPts);

	for (i = 0 ; i < NumElems ; i++)
		Coeff [i] = a [1 + i];

	free_dvector (a, 0);
	free_ivector (avar, 0);
	free_dmatrix (covar, 0, 1 + 2 * NumElems, 0);

	return;
}


// This routine calculates the value and derivative for a sign controlled compliance
// Prony series.  Sign control is enforced whenever a time point is less than tfirst

void Prony_Compliance_Sign_Control (double t, double *a, double *y, double *dyda)
{
	intL i, NumElems;
	double *Coeff, *Tau, tfirst, temp;

	NumElems = a [0];
	Coeff = &a [1];
	Tau = &a [1 + NumElems];
	tfirst = a [1 + 2 * NumElems];

	if (t <= tfirst * 1.001 && tfirst >= 0.)
		for (i = 0 ; i < NumElems ; i++)
			Coeff [i] = fabs (Coeff [i]);

	*y = Coeff [0];
	dyda [1] = 1.;
	for (i = 1 ; i < NumElems ; i++) {
		temp = 1. - exp (- t / Tau [i]);
		*y += Coeff [i] * temp;
		dyda [1 + i] = temp;
	}

	return;
}


// This routine is passed data for the natural log of the effective time, which can be
// fit using a sign controlled Prony series.  This Prony series enforces C0 and C1
// continuity with the previous results (which eliminates the DOFs associated with the
// first and second coefficients).  The relaxation times are set, and the guess is made
// in this routine.  The Prony series which satifies is found and returned.

void Fit_Lambda_Prony (intL NumElems, double *Coeff, double *Tau, double gamma,
							  intL NumPts, double *t, double *H, double *RMS)
{
	intL i, nvar, *avar;
	double A, B, C, H_At_s, dH_At_s, s, *a, **covar, *p, i_chisq, chisq;
	char message [80];

// Get the continuity information to start the process

	s = Tau [0];
	H_At_s = Coeff [0];
	dH_At_s = Coeff [1];

// First, set the relaxation times

	if (t [0] > 0.)
		Set_Relaxation_Times (NumElems, Tau, t [0] / gamma, t [NumPts-1] * gamma);
	else
		Set_Relaxation_Times (NumElems, Tau, t [1] / gamma, t [NumPts-1] * gamma);

// Now create the guess using A, B, C

	A = 0.5;
	B = 2.;
	Coeff [0] = -1.;
	Coeff [1] = H [0];
	Coeff [2] = H [NumPts-1];
	if (Coeff [2] < Coeff [1])
		nrerror ("\nRoutine Fit_Compliance_Prony needs ever increasing data - correct\n");
	else
		C = log10 (Coeff [2] / Coeff [1]) / 20.;

	Set_Prony_Guess (NumElems, Coeff, Tau, Coeff, 0., 0., A, B, C);

	for (i = 1 ; i < NumElems ; i++) {  // Correct to compliance type Prony series
		Coeff [0] += Coeff [i];
		Coeff [i] *= -1.;
	}

// Modify guess by setting Coeff [0], Coeff [1], Tau [0] - this will no longer satisfy
// the guess criterion and long and short times, but should still be reasonable

	Tau [0] = s;
	Coeff [0] = H_At_s;
	Coeff [1] = dH_At_s * Tau [1];

// Now set up L-M solution parameters

	a = dvector (0, 1 + 2 * NumElems);
	avar = ivector (0, 1 + 2 * NumElems);
	covar = dmatrix (0, 1 + 2 * NumElems, 0, 1 + 2 * NumElems);

// Distribute coefficients into a for use by LM solver when we allow for sign control

	a [0] = NumElems + 0.001;
	nvar = NumElems - 2;	  							// The number of varying coefficients
	for (i = 0 ; i < NumElems ; i++) {
		a [1 + i] = Coeff [i];
		a [1 + NumElems + i] = Tau [i];
		if (i >= 2)
			avar [i - 2] = i + 1;
	}
	a [1 + 2 * NumElems] = t [0];

// Set up solution method

	p = dvector (0, 4);
	p [0] = -1.;			   // This tells it to use these params not defaults
	p [1] = 20.001;			// Allow to run 20 iterations before loosening tolerance
	p [2] = 0.0005;			// ConvR: Convergence ratio which is acceptable
	p [3] = 1.;					// StdDevPct = 1.
	p [4] = 1.;					// Use RMS convergence criterion

	sprintf (message, "X At t=0 %%12.5E  Mu (Ignore) %%7.0E  RMS %%12.5E   ");
	Levenberg (t, H, H, NumPts, a, 2 + 2 * NumElems, avar, nvar,
				  &chisq, &i_chisq, Prony_Lambda_Sign_Control, message, p);
	*RMS = 100. * sqrt (chisq / NumPts);

	for (i = 2 ; i < NumElems ; i++)
		Coeff [i] = a [1 + i];

// Return Coeff [0] and Coeff [1] to standard form by evaluation

	Coeff [1] = dH_At_s * Tau [1] * exp (s / Tau [1]);
	for (i = 2 ; i < NumElems ; i++)
		Coeff [1] -= Coeff [i] * Tau [1] / Tau [i] * exp (s / Tau [1] - s / Tau [i]);

	Coeff [0] = H_At_s;
	for (i = 1 ; i < NumElems ; i++)
		Coeff [0] -= Coeff [i] * (1. - exp (- s / Tau [i]));

	free_dvector (a, 0);
	free_dvector (p, 0);
	free_ivector (avar, 0);
	free_dmatrix (covar, 0, 1 + 2 * NumElems, 0);

	return;
}


// This routine calculates the value and derivative for a sign controlled compliance
// Prony series.  Sign control is enforced whenever a time point is less than tfirst
// The first slot of dyda will be returned with dy/dt (t) if tfirst = -1

void Prony_Lambda_Sign_Control (double t, double *a, double *y, double *dyda)
{
	intL i, NumElems, calc_deriv = 0;
	double *Coeff, *Tau, tfirst, temp, val, val2, val3;

	NumElems = a [0];
	Coeff = &a [1];
	Tau = &a [1 + NumElems];
	tfirst = a [1 + 2 * NumElems];

	if (tfirst != -1.) {
		if (t <= tfirst * 1.001)
			for (i = 2 ; i < NumElems ; i++)		// Do not alter the first two coeffs
				Coeff [i] = fabs (Coeff [i]);    // which do not vary and enforce continuity
	}
	else
		calc_deriv = 1;								// Calculate dy/dt

	*y = Coeff [0];		// Results for first (non varying) term
	dyda [1] = 1.;			// Not used by solver

	val = exp ((Tau [0] - t) / Tau [1]);
	*y += Coeff [1] * (1. - val);          // Results from second (non varying) term
	dyda [2] = Coeff [1] / Tau [1] * val;	// Not used by solver

	for (i = 2 ; i < NumElems ; i++) {
		temp = exp (- t / Tau [i]);
		val2 = Tau [1] / Tau [i];
		val3 = exp (Tau [0] / Tau [i]);
		temp = val3 * (val2 * (val - 1.) + 1.) - temp;
		*y += Coeff [i] * temp;
		dyda [1 + i] = temp;
	}

	if (calc_deriv == 1) {
		dyda [0] = Coeff [1] / Tau [1] * val;
		for (i = 2 ; i < NumElems ; i++) {
			temp = exp (- t / Tau [i]);
			val2 = Tau [0] * (Tau [1] - Tau [i]) + Tau [i] * t;
			temp -= exp (val2 / (Tau [1] * Tau [i]));
			dyda [0] += Coeff [i] / Tau [i] * temp;
		}
	}

	return;
}


/***************************************************************************************

	Set Prony Guess - this routine is passed a Prony series that is not in sign control
	and creates a guess for the sign control solution.  It does this via the following
	parameters:

	Coeff, Tau - current params without sign control

	tmin - the mininum evaluation time
	tmax - the maximum evaluation time

	cI - the value of the Prony series at tmin
	cL - the value of the Prony series at tmax

	Once cI and cL are calculated, we will create coefficients of the sign control Prony
	series which satisfy:

		X(0) = a * cI	;	X(Infinity) = b * cL

	This we do via the parameter d.  Set

		X_0 = b * cL

		X_i = e * Tau_i ^ d

	where e is determined to make X(0) = a * cI

	The guess is returned in Guess

***************************************************************************************/

void Set_Prony_Guess (intL NumElems, double *Coeff, double *Tau, double *Guess,
							 double tmin, double tmax, double a, double b, double d)
{
	intL i;
	double cI, cL, e, tmp;

// First evaluate cL and cI

	if (Coeff [0] < 0.) {	// In this case, cI and cL are passed in Coeff [1, 2] resp
		cI = Coeff [1];
		cL = Coeff [2];
	}
	else {						// In this case, calculate from previous solution
		cI = Coeff [0];
		cL = Coeff [0];
		for (i = 1 ; i < NumElems ; i++) {
			cI += Coeff [i] * exp (- tmin / Tau [i]);
			cL += Coeff [i] * exp (- tmax / Tau [i]);
		}
	}

// Now set first values of guess

	Guess [0] = b * cL;
	tmp = 0.;
	for (i = 1 ; i < NumElems ; i++) {
		Guess [i] = pow (Tau [i], d);
		tmp += Guess [i];
	}

// Now enforce condition that X(0) = a * cI

	e = (a * cI - b * cL) / tmp;
	for (i = 1 ; i < NumElems ; i++)
		Guess [i] *= e;

// Check and print to the user

	tmp = Guess [0];
	for (i = 1 ; i < NumElems ; i++)
		tmp += Guess [i];

	return;
}


/*************************************************************************************

	The function below checks if the data is compliance or modulus by looking at the
	results during the first load step. It returns 1 if compliance and 2 if modulus.
	If the Flag is 1, a print to the screen is issued.
	
	Code Completed: 1 Dec 1997

*************************************************************************************/

intL comp_mod_check (double *t, double *compmod, intL NumPts, double *steps, 
							char *project, char *extension, intL Flag)
{
	intL i, j, data_type;
	double tmp;

	j = 0;
	tmp = 0.;

	do {j++;} while (t [j] < steps [1] && j < NumPts);		// Count points in first step
	for (i = 0 ; i < j/2 - 1 ; i++)								// Sum differences
		tmp += compmod [j - 1 - i] - compmod [i];
	if (tmp > 0.) {													// Use sign of tmp to decide
		data_type = 1;							  		// Data is increasing so must be compliance
		if (Flag == 1)
			printf ("File %s.%s Contains %5d Points Of Compliance Data\n\n",
						project, extension, NumPts);
	}
	else {
		data_type = 2;							  		// Data is decreasing so must be modulus
		if (Flag == 1)
			printf ("File %s.%s Contains %5d Points Of Modulus Data\n\n",
						project, extension, NumPts);
	}

	return data_type;
}

/*************************************************************************************

	The function below allows the user to modify the standard deviation. This assumes
	that the standard deviation has been initially set to the value of the data points.
	The modification desired is passed by code as:
	
		code = 0			No change (use std_dev = data)
		code = 1			Set all to value (use std_dev = value)
		code = 2			Set to data if fabs(data) > value, otherwise set to value

	Code Completed: 1 Dec 1997
	Code Updated: 14 Jan 1997		To remove questions and change up code

*************************************************************************************/

void modify_std_dev (intL code, double *compmod, double *std_dev,
							intL NumPts, double value)
{
	intL i;

	value = fabs (value);							// Make sure this is positive

	if (code < 0 || code > 2)
		nrerror ("Code needs to be between 0 and 2 for modify_std_dev");

// For code = 0, no change needed

	if (code == 1) {
		if (value == 0.)								// Needs to be nonzero
			nrerror ("Value needs to be nonzero in modify_std_dev");

		for (i = 0 ; i < NumPts ; i++) 			// Set std_dev to value
			std_dev [i] = value;
	}

	if (code == 2) {
		if (value == 0.)								// Needs to be nonzero
			nrerror ("Value needs to be nonzero in modify_std_dev");

		for (i = 0 ; i < NumPts ; i++) 			// Set std_dev to value since data small
			if (fabs (compmod [i]) < value)		// No change needed if larger (already
				std_dev [i] = value;					// set to the data point value on enter)
	}

	return;
}

/********************************* End Of VESOLVER.C **********************************/
