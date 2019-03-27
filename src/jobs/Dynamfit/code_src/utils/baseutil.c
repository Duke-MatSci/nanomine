/*************************************************************************************

	BASEUTIL.C

	This file contains basic memory and pointer routines used by the Northwestern
	Physical Aging Codes.  Most of these are modified from Numerical Recipes For C 
	(dynamic memory allocation, error routine).  These codes have been extended to use
	integer declaration intL, which should in general be defined as "long int", but it
	can be changed to be "int" for necessary reasons.  Whichever choice should be
	reflected in all future codes to avoid upper counter limits.

	NOTE: The use of "long int" in DMA requires 32 bit addressing.  If this is not
	available for your platform, use "int" instead and do not attempt to allocate any
	memory block larger than 64k and everything should be OK. Other difficulties may
	occur, however, depending upon the application under consideration. Hopefully,
	with my final codes I will eliminate such issues.

	Roger Bradshaw, Northwestern University / University of Washington

	First Written: 1 November 1995
	Updated: 16 September 1996
	Updated: 2 February 1997 (to include 3 tensors as definitions)
	Updated: 25 October 1997	Added vectors of file pointers
	Updated: 28 November 1997	Mostly changes to layout for new VC++ platform
	Updated: 1 December 1997	Moved some items to new file BASE_IO.C

*************************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <curses.h>
//#include <conio.h>
#include <ctype.h>
#include "baseutil.h"

#define intL long int				// Use either "int" or "long int"
#define Proj_Name_Length 240		// Maximum project name length (8 for DOS systems)
#define GET_ONE_CH getch()			// Function to get one character only from stdin

/*************************************************************************************

	This routine allocates a double vector dynamically, and exits with an error if the
	memory could not be allocated.  The elements of the vector will go between
	v [nl] through v [nh].

*************************************************************************************/

double *dvector (intL nl, intL nh)
{
	double *v;
	v = (double *) malloc ( (unsigned) (nh - nl + 1) * sizeof (double) );
	if (!v) nrerror ("\nFailure In Allocation Of Double Vector In dvector()\n");
	return v-nl;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated double vector

*************************************************************************************/

void free_dvector (double *v, intL nl)
{
	free ((char*) (v+nl));
	return;
}

/*************************************************************************************

	This routine allocates a intL vector dynamically, and exits with an error if
	the memory could not be allocated.  The elements of the vector will go between
	v [nl] through v [nh].

*************************************************************************************/

intL *ivector (intL nl, intL nh)
{
	intL *v;
	v = (intL *) malloc ((unsigned) (nh - nl + 1) *sizeof (intL));
	if (!v) nrerror ("\nFailure In Allocation Of Integer Vector In ivector()\n");
	return v-nl;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated intL vector

*************************************************************************************/

void free_ivector (intL *v, intL nl)
{
	free ((char*) (v + nl));
	return;
}

/*************************************************************************************

	This routine allocates a character vector dynamically, and exits with an error if
	the memory could not be allocated.  The elements of the vector will go between
	v [nl] through v [nh].

*************************************************************************************/

char *chvector (intL nl, intL nh)
{
	char *v;
	v = (char *) malloc ( (unsigned) (nh - nl + 1) *sizeof (char) );
	if (!v) nrerror ("\nFailure In Allocation Of Character Vector In chvector()\n");
	return v-nl;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated character vector

*************************************************************************************/

void free_chvector (char *v, intL nl)
{
	free ((char*) (v+nl));
	return;
}

/*************************************************************************************

	This routine allocates a double matrix dynamically, and exits with an error if
	the memory could not be allocated.  The four corner elements of the matrix will be:

			v [nrl][ncl]	v [nrl][nch]
			v [nrh][ncl]	v [nrh][nch]

	where nr and nc means "number of rows" and "number of columns", respectively.

*************************************************************************************/

double **dmatrix (intL nrl, intL nrh, intL ncl, intL nch)
{
	intL i;
	double **m;

	m = (double **) malloc ( (unsigned) (nrh - nrl + 1) * sizeof (double*) );
	if (!m) nrerror ("\nFailure In Allocation Of Row Pointers In dmatrix()\n");
	m -= nrl;

	for (i = nrl ; i <= nrh ; i++) {
		m [i] = (double *) malloc ( (unsigned) (nch - ncl + 1) * sizeof (double) );
		if (!m[i]) nrerror ("\nFailure In Allocation Of Row Vectors In dmatrix()\n");
		m[i] -= ncl;
	}

	return m;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated double matrix

*************************************************************************************/

void free_dmatrix (double **m, intL nrl, intL nrh, intL ncl)
{
	intL i;

	for (i = nrh ; i >= nrl ; i--)
		free( (char*) (m [i] + ncl) );

	free ( (char*) (m + nrl) );

	return;
}

/*************************************************************************************

	This routine allocates a char matrix dynamically, and exits with an error if
	the memory could not be allocated.  The four corner elements of the matrix will be:

			v [nrl][ncl]	v [nrl][nch]
			v [nrh][ncl]	v [nrh][nch]

	where nr and nc means "number of rows" and "number of columns", respectively.

*************************************************************************************/

char **chmatrix (intL nrl, intL nrh, intL ncl, intL nch)
{
	intL i;
	char **m;

	m = (char **) malloc ( (unsigned) (nrh - nrl + 1) * sizeof (char *) );
	if (!m) nrerror ("\nFailure In Allocation Of Row Pointers In chmatrix()\n");
	m -= nrl;

	for (i = nrl ; i <= nrh ; i++) {
		m [i] = (char *) malloc ( (unsigned) (nch - ncl + 1) * sizeof (char) );
		if (!m[i]) nrerror ("\nFailure In Allocation Of Row Vectors In chmatrix()\n");
		m[i] -= ncl;
	}

	return m;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated char matrix

*************************************************************************************/

void free_chmatrix (char **m, intL nrl, intL nrh, intL ncl)
{
	intL i;

	for (i = nrh ; i >= nrl ; i--)
		free( (char*) (m [i] + ncl) );

	free ( (char*) (m + nrl) );

	return;
}

/*************************************************************************************

	This routine allocates a double tensor (order 3) dynamically, and exits with an
	error if the memory could not be allocated.  The 8 corner elements of the matrix
	will be:

		v [nrl][ncl][nsl]	 v [nrl][nch][nsl]	v [nrl][ncl][nsh]	 v [nrl][nch][nsh]
		v [nrh][ncl][nsl]	 v [nrh][nch][nsl]	v [nrh][ncl][nsh]	 v [nrh][nch][nsh]

	where nr, nc, and ns mean	"number of rows", "number of columns", and
	"number of sheets" respectively.

*************************************************************************************/

double ***d3tensor (intL nrl, intL nrh, intL ncl, intL nch, intL nsl, intL nsh)
{
	intL i, j;
	double ***t;

// Allocate pointers to rows

	t = (double ***) malloc ( (size_t) (nrh - nrl + 1) * sizeof (double*) );
	if (!t) nrerror ("\nFailure In Allocation Of Row Pointers In d3tensor()\n");
	t -= nrl;

// Allocate pointers to columns

	for (i = nrl ; i <= nrh ; i++) {
		t [i] = (double **) malloc ( (unsigned) (nch - ncl + 1) * sizeof (double) );
		if (!t[i]) nrerror ("\nFailure In Allocation Of Row Vectors In d3tensor()\n");
		t[i] -= ncl;
	}

// Allocate pointers to sheets

	for (i = nrl ; i <= nrh ; i++) {
		for (j = ncl ; j <= nch ; j++) {
			t [i][j] = (double *) malloc ( (unsigned) (nsh - nsl + 1) * sizeof (double) );
			if (!t[i][j])
				nrerror ("\nFailure In Allocation Of Row Sheets In d3tensor()\n");
			t[i][j] -= nsl;
		}
	}

	return t;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated double 3 tensor

*************************************************************************************/

void free_d3tensor (double ***t, intL nrl, intL nrh, intL ncl, intL nch, intL nsl)
{
	intL i, j;

	for (i = nrl ; i <= nrh ; i++) {
		for (j = ncl ; j <= nch ; j++) {
			free( (char*) (t [i][j] + nsl) );
		}
	}

	for (i = nrh ; i >= nrl ; i--)
		free ( (char*) (t [i] + ncl) );

	free ( (char*) (t + nrl) );

	return;
}

/*************************************************************************************

	This routine allocates a double tensor (order 4) dynamically, and exits with an
	error if the memory could not be allocated.  The 16 corner elements of the matrix
	will be:

		v [nrl][ncl][nsl][nbl]	v [nrl][nch][nsl][nbl]
		v [nrh][ncl][nsl][nbl]	v [nrh][nch][nsl][nbl]

		v [nrl][ncl][nsh][nbl]	v [nrl][nch][nsh][nbl]
		v [nrh][ncl][nsh][nbl]	v [nrh][nch][nsh][nbl]

		v [nrl][ncl][nsl][nbh]	v [nrl][nch][nsl][nbh]
		v [nrh][ncl][nsl][nbh]	v [nrh][nch][nsl][nbh]

		v [nrl][ncl][nsh][nbh]	v [nrl][nch][nsh][nbh]
		v [nrh][ncl][nsh][nbh]	v [nrh][nch][nsh][nbh]

	where nr, nc, ns, and nb mean	"number of rows", "number of columns",
	"number of sheets", and "number of boxes" respectively.

*************************************************************************************/

double ****d4tensor (intL nrl, intL nrh, intL ncl, intL nch,
							intL nsl, intL nsh, intL nbl, intL nbh)
{
	intL i, j, k;
	double ****t;

// Allocate pointers to rows

	t = (double ****) malloc ( (size_t) (nrh - nrl + 1) * sizeof (double*) );
	if (!t) nrerror ("\nFailure In Allocation Of Row Pointers In d3tensor()\n");
	t -= nrl;

// Allocate pointers to columns

	for (i = nrl ; i <= nrh ; i++) {
		t [i] = (double ***) malloc ( (unsigned) (nch - ncl + 1) * sizeof (double) );
		if (!t[i]) nrerror ("\nFailure In Allocation Of Row Vectors In d3tensor()\n");
		t[i] -= ncl;
	}

// Allocate pointers to sheets

	for (i = nrl ; i <= nrh ; i++) {
		for (j = ncl ; j <= nch ; j++) {
			t [i][j] = (double **) malloc ( (unsigned) (nsh - nsl + 1) * sizeof (double) );
			if (!t[i][j])
				nrerror ("\nFailure In Allocation Of Row Sheets In d3tensor()\n");
			t[i][j] -= nsl;
		}
	}

// Allocate pointers to boxes

	for (i = nrl ; i <= nrh ; i++) {
		for (j = ncl ; j <= nch ; j++) {
			for (k = nsl ; k <= nsh ; k++) {
				t [i][j][k] = (double *) malloc ( (unsigned)(nbh-nbl+1) * sizeof (double) );
				if (!t[i][j][k])
					nrerror ("\nFailure In Allocation Of Row Boxes In d3tensor()\n");
				t[i][j][k] -= nbl;
			}
		}
	}

	return t;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated double 4 tensor

*************************************************************************************/

void free_d4tensor (double ****t, intL nrl, intL nrh, intL ncl, intL nch,
						  intL nsl, intL nsh, intL nbl)
{
	intL i, j, k;

	for (i = nrl ; i <= nrh ; i++) 
		for (j = ncl ; j <= nch ; j++) 
			for (k = nsl ; k <= nsh ; k++)
				free ( (char*) (t [i][j][k] + nbl) );

	for (i = nrl ; i <= nrh ; i++) 
		for (j = ncl ; j <= nch ; j++) 
			free ( (char*) (t [i][j] + nsl) );

	for (i = nrh ; i >= nrl ; i--)
		free ( (char*) (t [i] + ncl) );

	free( (char*) (t + nrl) );

	return;
}

/*************************************************************************************

	This routine allocates a vector of (nh-nl) file pointers dynamically. In order to
	assign a file to the ith file pointer in the FILE **stream, insert the code

		stream [i] = fopen (file_name, read_write_type);

*************************************************************************************/

FILE **FILE_vector (intL nl, intL nh)
{
	intL i;
	FILE **stream;

	stream = (FILE **) malloc ( (unsigned) (nh - nl + 1) * sizeof (FILE *) );
	if (!stream) nrerror ("\nFailure In Allocation Of FILE Pointers In FILE_vector()\n");
	stream -= nl;

	for (i = nl ; i <= nh ; i++)								// Initialize each file pointer
		stream [i] = NULL;

	return stream;
}

/*************************************************************************************

	This routine frees up the memory used by a dynamically allocated FILE vector

*************************************************************************************/

void free_FILE_vector (FILE **stream, intL nl)
{
	free ((FILE **) (stream+nl));
	return;
}

/*************************************************************************************

	This is the error routine returned to user.  The reported error is contained in the
	character pointer.  The routine exits to system upon completion.

*************************************************************************************/

void nrerror (char *error_text)
{
	intL j;
	fprintf (stderr, "\a\nRun-time error...");
	fprintf (stderr, "\n\n%s\n\n",error_text);
	fprintf (stderr, "...Hit <X> to exit to system...\n");
	do {j = GET_ONE_CH;} while (j != 88 && j != 120);
	exit (1);
}

/*************************************************************************************

	This is the error routine returned to user.  The reported error is contained in the
	character pointer.  The routine exits to system upon completion unless the user
	requests to ignore the error.

*************************************************************************************/

void error_with_ignore (char *error_text)
{
	intL j;
	fprintf (stderr, "\a\nRun-time error...");
	fprintf (stderr, "\n\n%s\n\n",error_text);
	fprintf (stderr, "...Hit <X> to exit to system or <Y>"
						  " to ignore error and continue...\n");
	do {j = getch();} while (j != 88 && j != 120 && j != 89 && j != 121);

	if (j == 89 || j == 121)
		return;                 // User wants to ignore error
	else
		exit(1);						// User wants to stop program
}

/***************************************************************************************

	These functions recast double pointers (vector, matrix, 3tensor) as a single double
	which can be later recovered by the other functions which do the reverse.  Each of
	these can be done without using a separate function, but it will make it easier to do
	this way for clarity and recalling what I meant to do in each case.

	Roger Bradshaw, Northwestern University
	Completed: 11 July 1997

***************************************************************************************/

double dbl_vector_ptr_to_dbl (double *dbl_vector_ptr)
{
	return (double) (intL) dbl_vector_ptr;
}

double* dbl_to_dbl_vector_ptr (double dbl_vector_ptr_as_dbl)
{
	return (double *) (intL) dbl_vector_ptr_as_dbl;
}

double int_vector_ptr_to_dbl (intL *int_vector_ptr)
{
	return (double) (intL) int_vector_ptr;
}

intL* dbl_to_int_vector_ptr (double int_vector_ptr_as_dbl)
{
	return (intL *) (intL) int_vector_ptr_as_dbl;
}

double dbl_matrix_ptr_to_dbl (double **dbl_matrix_ptr)
{
	return (double) (intL) dbl_matrix_ptr;
}

double** dbl_to_dbl_matrix_ptr (double dbl_matrix_ptr_as_dbl)
{
	return (double**) (intL) dbl_matrix_ptr_as_dbl;
}

double dbl_3tensor_ptr_to_dbl (double ***dbl_3tensor_ptr)
{
	return (double) (intL) dbl_3tensor_ptr;
}

double*** dbl_to_dbl_3tensor_ptr (double dbl_3tensor_ptr_as_dbl)
{
	return (double***) (intL) dbl_3tensor_ptr_as_dbl;
}

/**************************  End Of BASEUTIL.C  *************************************/
